import { currentMealType } from "./daily";
import { parseDayReferences } from "./day-ref";
import { MEAL_TYPE_LABELS } from "./meals";
import { usesFormalYou } from "./persona";
import { AFFIRMATIVE, clauses, NEGATIVE, NOT_DONE } from "./routine-detect";
import { findCourse, parseBlocks, type Course } from "./study";
import { normalizeTr } from "./text";
import { addDays } from "./time";
import type { MealType, RoutineItem } from "./types";

// Sesle (ve yazıyla) günlük kayıt — Faz 4 § 3. LLM'siz: niyeti KOD ayırır,
// kaydı KOD yazar. Öğün: "öğlen menemen yedim, 4 puan", "kahvaltıda omlet
// yedim, güzeldi". Belirsizse (öğün ya da yemek belli değil) tahmin edilmez,
// tek kısa soru sorulur; cevap gelince kayıt yapılır. "Geri al" son kaydı siler.

export interface MealEntry {
  date: string;
  mealType: MealType;
  mealId: string | null;
  mealName: string;
  isLeftover: boolean;
  rating: number | null;
  note: string | null;
}

/** Sorulan sorunun cevabı beklenirken asistan mesajında saklanan yarım iş. */
export type PendingLog =
  | { kind: "ogun"; date: string; mealType: MealType; mealId: string | null; mealName: string | null; isLeftover: boolean; rating: number | null; note: string | null }
  | { kind: "rutin"; date: string; items: RoutineItem[] }
  /** Çalışma bloğu (Bölüm 18): ders ya da blok sayısı eksik, tek soru soruldu */
  | { kind: "calisma"; date: string; courseId: string | null; blocks: number | null };

export interface KnownMeal {
  id: string | null;
  name: string;
}

export interface MealContext {
  today: string;
  time: string;
  hitap: string;
  /** Tarif listesi + son kayıtlardaki yemek adları (doğru yazım ve tarif bağlantısı için) */
  known: KnownMeal[];
  /** Bugünün önerileri (kalan porsiyon dahil) */
  suggestions: Partial<Record<MealType, { id: string; name: string; leftover: boolean }>>;
  /** Hemen önceki asistan mesajı: planlı konuşmaysa hangi an */
  previous?: { content: string; proactive?: string | null } | null;
}

export type MealDetect =
  | { kind: "kayit"; entry: MealEntry }
  | { kind: "sor"; question: string; pending: PendingLog }
  /** Bugün/dün dışında bir gün — kaydedilmez */
  | { kind: "baska-gun" }
  | { kind: "yok" };

const EAT_VERB = /\b(?:ye(?:d|mist)[iu](?:m|k)|corba\w* ict[iu](?:m|k)|kahvalti\w* (?:yapt|ett)[iu](?:m|k)|atistird[iu](?:m|k))\b/;
const TYPE_WORDS: [MealType, RegExp][] = [
  ["kahvalti", /^(?:kahvalti\w*|sabah\w*)$/],
  ["ogle", /^(?:ogle\w*|oglen\w*)$/],
  ["aksam", /^aksam\w*$/],
];
const FILLER = new Set(
  "ben biz bugun dun az once biraz bir de da olarak icin simdi tam evde disarida zaten yine gene cok guzel guzelce afiyetle tamam evet hepsini hepsi onu bunu sunu ondan bundan iki uc dort bes on uzerinden yemek yemegi yemegimi yemegini yemeginde yemekte yemegim ogun ogunu ogunde kalan kalani yapt yaptim ettim yedim yedik yemistim icin icip ictim ictik atistirdim hayir yok mi mu mu misin yaz yazabilirsin kaydet ekle olarak puan verdim".split(
    " ",
  ),
);
const NUMBER_WORDS: Record<string, number> = { bir: 1, iki: 2, uc: 3, dort: 4, bes: 5 };
/** "Kafayı yedim", "gol yedik"… yemek değil. */
const IDIOM = /\b(?:kafa\w*|kazik|ceza\w*|gol|laf|dayak|hakk\w*|zilli|azar|firca|tokat)\b(?: \w+)? ye(?:d|mist)[iu](?:m|k)\b/;
const EVALUATIVE = /\b(?:guzel|iyi|lezzetli|harika|super|enfes|mukemmel|kotu|berbat|tuzlu|yavan|tatsiz|agir|fena|nefis|olmus|olmamis)\w*/;

function mealTypeOf(tokens: string[]): MealType | null {
  const found = new Set<MealType>();
  for (const t of tokens) for (const [type, re] of TYPE_WORDS) if (re.test(t)) found.add(type);
  return found.size === 1 ? [...found][0] : null;
}

/** "4 puan", "puanım 4", "5 üzerinden 4", "dört verdim", "10 üzerinden 8" → 1–5 */
export function parseRating(message: string): number | null {
  const t = normalizeTr(message);
  const num = "([1-9]|10|bir|iki|uc|dort|bes)";
  const toN = (x: string) => NUMBER_WORDS[x] ?? Number(x);
  const ten = t.match(new RegExp(`\\b10 uzerinden ${num}\\b`));
  if (ten) return Math.max(1, Math.min(5, Math.round(toN(ten[1]) / 2)));
  for (const re of [new RegExp(`\\b5 uzerinden ${num}\\b`), new RegExp(`\\bbes uzerinden ${num}\\b`), new RegExp(`\\b${num} puan\\b`), new RegExp(`\\bpuan\\w* ${num}\\b`), new RegExp(`\\b${num} verdim\\b`)]) {
    const m = t.match(re);
    if (m) {
      const n = toN(m[1]);
      return n >= 1 && n <= 5 ? n : null;
    }
  }
  return null;
}

/** Ham parçadaki kelimeler (orijinal yazım) + normalize karşılıkları. */
function tokensOf(raw: string): { raw: string; norm: string }[] {
  return raw
    .split(/\s+/)
    .map((w) => ({ raw: w.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, ""), norm: normalizeTr(w) }))
    .filter((w) => w.raw && w.norm);
}

/** Yemek adı sayılacak kelimeler: öğün, fiil, dolgu kelimeleri ve rakamlar dışında kalanlar. */
function dishTokens(tokens: { raw: string; norm: string }[]): { raw: string; norm: string }[] {
  return tokens.filter(
    (t) => !FILLER.has(t.norm) && !EVALUATIVE.test(t.norm) && !TYPE_WORDS.some(([, re]) => re.test(t.norm)) && !EAT_VERB.test(t.norm) && !/^\d+$/.test(t.norm) && !/^(?:ye|ic)\w*(?:d|t)[iu](?:m|k)$/.test(t.norm),
  );
}

/** Bilinen bir yemekle eşleşme: "menemeni" → Menemen, "mercimeği" → Mercimek çorbası (en uzun eşleşen). */
function matchKnown(dish: string, known: KnownMeal[]): KnownMeal | null {
  const d = dish.split(" ").filter(Boolean);
  if (!d.length) return null;
  let best: KnownMeal | null = null;
  // Tek kelimeyle ("mercimeği") ada eşleşme yalnızca o kelimeyle başlayan TEK bilinen yemek varsa — "tavuk" birçok şey olabilir.
  const heads = (w: string) => known.filter((k) => normalizeTr(k.name).startsWith(w.slice(0, 5))).length;
  for (const k of known) {
    const words = normalizeTr(k.name).split(" ").filter((w) => w.length >= 3);
    if (!words.length) continue;
    // Bilinen adın her kelimesi söylenende (Türkçe ekler için ilk 5 harf) geçmeli — ya da söylenen tek kelime adın ilk kelimesiyse.
    const said = (w: string) => d.some((x) => x.startsWith(w.slice(0, 5)));
    const all = words.every(said);
    const head = d.length === 1 && words[0].length >= 6 && said(words[0]) && heads(words[0]) === 1;
    if ((all || head) && (!best || k.name.length > best.name.length)) best = k;
  }
  return best;
}

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
const lowerFirst = (s: string) => s.charAt(0).toLocaleLowerCase("tr-TR") + s.slice(1);

/** Soru eki: "çorbası mı", "menemen mi", "tavuk mu", "börek mi"… */
export function questionParticle(word: string): string {
  const last = [...word.toLocaleLowerCase("tr-TR").replace(/[^aeıioöuü]/g, "")].at(-1);
  if (last === "a" || last === "ı") return "mı";
  if (last === "o" || last === "u") return "mu";
  if (last === "ö" || last === "ü") return "mü";
  return "mi";
}

function past(hitap: string, formal: string, informal: string) {
  return usesFormalYou(hitap) ? formal : informal;
}

/** Mesajda geçmiş zamanlı bir "yedim" var mı (öğün bağlamını yüklemeye değer mi). */
export function mentionsEating(message: string): boolean {
  return EAT_VERB.test(normalizeTr(message));
}

/** Mesajdan öğün kaydı niyeti. Tamamsa kayıt, eksikse tek soru. */
export function detectMealLog(message: string, ctx: MealContext): MealDetect {
  const parts = clauses(message);
  const rawParts = rawClauses(message);
  const eatIdx = parts.findIndex((c) => !c.question && EAT_VERB.test(c.text) && !IDIOM.test(c.text) && !NEGATIVE.test(c.text) && !NOT_DONE.test(c.text));
  if (eatIdx < 0) return { kind: "yok" };

  // Gün: bugün; yalnızca açıkça "dün" denirse dün.
  const refs = parseDayReferences(message, ctx.today).filter((d) => d !== ctx.today);
  const yesterday = addDays(ctx.today, -1);
  if (refs.length && !(refs.length === 1 && refs[0] === yesterday && /\bdun\b/.test(normalizeTr(message)))) return { kind: "baska-gun" };
  const date = refs.length ? yesterday : ctx.today;

  const tokens = tokensOf(rawParts[eatIdx] ?? "");
  let mealType = mealTypeOf(tokens.map((t) => t.norm)) ?? mealTypeOf(normalizeTr(message).split(" "));
  // Planlı konuşmada "öğle vakti" dendiyse cevap o öğüne.
  const slot = ctx.previous?.proactive;
  if (!mealType && (slot === "kahvalti" || slot === "ogle" || slot === "aksam")) mealType = slot;

  // Türkçede nesne fiilden önce gelir: yemek adı fiilden önceki kelimelerden ("öğlen menemen yedim annemle").
  const verbPos = tokens.findIndex((t) => /^(?:ye|ic)\w*(?:d|t)[iu](?:m|k)$/.test(t.norm) || /^(?:yapt|ett)[iu](?:m|k)$/.test(t.norm));
  const dishRaw = dishTokens(verbPos > 0 ? tokens.slice(0, verbPos) : tokens).map((t) => t.raw).join(" ");
  const dishNorm = normalizeTr(dishRaw);
  const leftoverWord = tokens.some((t) => /^kalan/.test(t.norm));
  const rating = parseRating(message);
  // Not: ayrı bir yan cümle ("…yedim, çok güzeldi") ya da noktalamasız sesli yazıda fiilden sonrası ("…yedim çok güzeldi").
  const tail = verbPos >= 0 ? tokens.slice(verbPos + 1).filter((t) => !/^\d+$/.test(t.norm) && !/^(?:puan\w*|verdim|uzerinden)$/.test(t.norm)) : [];
  const tailNote = tail.some((t) => EVALUATIVE.test(t.norm)) ? tail.map((t) => t.raw).join(" ") : null;
  const note =
    rawParts.find((r, i) => i !== eatIdx && !parts[i]?.question && EVALUATIVE.test(normalizeTr(r)) && r.trim().split(/\s+/).length <= 8)?.trim() ?? tailNote;

  let known = dishNorm ? matchKnown(dishNorm, ctx.known) : null;
  // "Evet yedim" / "yedim" planlı konuşmada önerilen yemeğe cevapsa (öneri mesajda geçiyorsa) o yemek.
  const suggestion = mealType ? ctx.suggestions[mealType] : undefined;
  if (!dishNorm && suggestion && ctx.previous?.proactive === mealType && normalizeTr(ctx.previous.content).includes(normalizeTr(suggestion.name))) {
    known = { id: suggestion.id, name: suggestion.name };
  }
  const mealName = known ? known.name : dishRaw ? capitalize(dishRaw) : null;
  const isLeftover = Boolean(known && suggestion && suggestion.id === known.id && suggestion.leftover) || (leftoverWord && Boolean(known));

  const h = ctx.hitap;
  if (mealType && mealName) {
    return { kind: "kayit", entry: { date, mealType, mealId: known?.id ?? null, mealName, isLeftover, rating, note: note ? capitalize(note) : null } };
  }
  const guess = mealType ?? currentMealType(ctx.time);
  const label = lowerFirst(MEAL_TYPE_LABELS[guess]);
  const pending: PendingLog = { kind: "ogun", date, mealType: guess, mealId: known?.id ?? null, mealName, isLeftover, rating, note: note ? capitalize(note) : null };
  if (mealName) {
    return { kind: "sor", question: `${h}, ${lowerFirst(mealName)} ${label} yemeği olarak mı yazayım?`, pending };
  }
  const s = ctx.suggestions[guess];
  if (s) {
    const name = lowerFirst(s.name);
    return {
      kind: "sor",
      question: `${h}, ${label} yemeğinde ${name} ${questionParticle(name)} ${past(h, "yediniz", "yedin")}?`,
      pending: { ...pending, mealId: s.id, mealName: s.name, isLeftover: s.leftover },
    };
  }
  return { kind: "sor", question: `${h}, ${label} yemeğinde ne ${past(h, "yediniz", "yedin")}?`, pending };
}

/** routine-detect'in parçalarıyla aynı sırada ham (orijinal yazımlı) parçalar. */
function rawClauses(message: string): string[] {
  const out: string[] = [];
  for (const m of message.matchAll(/[^.,;!?\n]+([.,;!?\n]*)/g)) {
    for (const part of m[0].split(/(?<!\p{L})(?:ama|fakat|ancak|lakin|yalnız)(?!\p{L})/iu)) {
      if (normalizeTr(part)) out.push(part.replace(/[.,;!?\n]+$/, "").trim());
    }
  }
  return out;
}

export type PendingResolution =
  | { kind: "ogun"; entry: MealEntry }
  | { kind: "rutin"; date: string; items: RoutineItem[] }
  | { kind: "vazgec" }
  /** Cevap soruyla ilgisiz — bekleyen iş düşer, sohbet normal sürer */
  | { kind: "ilgisiz" };

/** Sorulan tek soruya gelen cevap: "evet" → yaz, "hayır, akşam" → düzelt, "menemen" → yemek adı. */
export function resolvePending(pending: PendingLog, message: string, known: KnownMeal[]): PendingResolution {
  const t = normalizeTr(message);
  const affirm = AFFIRMATIVE.test(t) || /\b(?:olur|dogru|aynen|yaz|kaydet|isaretle)\b/.test(t);
  const negative = NEGATIVE.test(t);
  if (pending.kind === "rutin") {
    if (affirm && !negative) return { kind: "rutin", date: pending.date, items: pending.items };
    return negative ? { kind: "vazgec" } : { kind: "ilgisiz" };
  }
  if (pending.kind === "calisma") return { kind: "ilgisiz" }; // resolveStudyPending'e gider
  // Soru, yeni bir cümle (fiil: "koşacağım", "geliyorum", "yaptım") ya da başka güne dair söz → cevap değil.
  const words = t.split(" ");
  const verbish = words.some((w) => /(?:iyor|uyor|acak|ecek|acag|eceg|(?:d|t)[iu](?:m|k|n)|m[iu]st[iu])\w*$/.test(w) && !/^(?:yedim|yedik|yaptim)$/.test(w));
  if (message.includes("?") || words.length > 6 || (!affirm && (verbish || NOT_DONE.test(t) || /\b(?:yarin|dun)\b/.test(t)))) {
    return negative && !verbish ? { kind: "vazgec" } : { kind: "ilgisiz" };
  }
  const tokens = tokensOf(message);
  const type = mealTypeOf(tokens.map((x) => x.norm));
  const dishRaw = dishTokens(tokens)
    .filter((x) => !AFFIRMATIVE.test(x.norm) && !/^(?:evet|hayir|yok|degil|olur|dogru|aynen|yaz|kaydet|isaretle)$/.test(x.norm))
    .map((x) => x.raw)
    .join(" ");
  const k = dishRaw ? matchKnown(normalizeTr(dishRaw), known) : null;
  const dish = k ? k.name : dishRaw ? capitalize(dishRaw) : null;
  const rating = parseRating(message) ?? pending.rating;

  if (negative && !type && !dish) return { kind: "vazgec" };
  // "Hayır, menemen" → yemek düzeltmesi; "Hayır, akşam" → öğün düzeltmesi.
  const mealType = type ?? pending.mealType;
  const mealName = dish ?? pending.mealName;
  const changed = Boolean(type || dish);
  if (!mealName || (!affirm && !changed)) return negative ? { kind: "vazgec" } : { kind: "ilgisiz" };
  return {
    kind: "ogun",
    entry: {
      date: pending.date,
      mealType,
      mealId: dish ? (k?.id ?? null) : pending.mealId,
      mealName,
      isLeftover: dish ? false : pending.isLeftover,
      rating,
      note: pending.note,
    },
  };
}

/** "geri al", "onu geri al", "son kaydı geri alır mısın" — "geri alma" değil. */
export function isUndoCommand(message: string): boolean {
  const t = normalizeTr(message);
  return t.split(" ").length <= 7 && /\bgeri al(?:$|\s|ir\b|abilir\b|sana\b|in\b|iver\w*)/.test(t) && !/\bgeri alma(?:\b|yin|sana)/.test(t);
}

/** Tek başına "yaptım / hallettim / bitirdim" — hangi madde olduğu söylenmemiş. */
export function isBareDone(message: string): boolean {
  const t = normalizeTr(message);
  return t.split(" ").length <= 3 && /^(?:(?:ben|evet|tamam) )?(?:yaptim|hallettim|bitirdim|tamamladim)(?: ben)?$/.test(t);
}

export function formatMealLine(e: MealEntry): string {
  return `${lowerFirst(MEAL_TYPE_LABELS[e.mealType])} — ${lowerFirst(e.mealName)}${e.isLeftover ? " (kalan)" : ""}${e.rating ? ` (${e.rating}/5)` : ""}`;
}


// ---------------------------------------------------------------------------
// Sesle çalışma bloğu kaydı (Bölüm 18): "ayrık matematik 2 blok çalıştım".
// Ders ve blok sayısı belliyse yazılır; biri eksikse tek soru. Bugün, yalnızca
// açıkça "dün" denirse dün.

export interface StudyEntry {
  date: string;
  courseId: string;
  blocks: number;
}

export type StudyDetect =
  | { kind: "kayit"; entry: StudyEntry }
  | { kind: "sor"; question: string; pending: Extract<PendingLog, { kind: "calisma" }> }
  | { kind: "baska-gun" }
  | { kind: "yok" };

const STUDY_VERB = /\b(?:calist[iu](?:m|k)|calisma(?:m|dim)? ?(?:yap\w*|bitir\w*))\b/;

export function detectStudyLog(message: string, ctx: { today: string; hitap: string; courses: Course[]; blockMin: number }): StudyDetect {
  const t = normalizeTr(message);
  const clause = clauses(message).find((c) => !c.question && STUDY_VERB.test(c.text) && !NEGATIVE.test(c.text) && !NOT_DONE.test(c.text));
  if (!clause) return { kind: "yok" };
  const course = findCourse(message, ctx.courses);
  const blocks = parseBlocks(message, ctx.blockMin);
  // "İşte çalıştım" gibi ders dışı cümleler: ne ders, ne blok, ne de "ders/sınav" kelimesi varsa kayıt değil.
  if (!course && !blocks && !/\b(?:ders|sinav|blok|vize)\b/.test(t)) return { kind: "yok" };
  const refs = parseDayReferences(message, ctx.today).filter((d) => d !== ctx.today);
  const yesterday = addDays(ctx.today, -1);
  if (refs.length && !(refs.length === 1 && refs[0] === yesterday && /\bdun\b/.test(t))) return { kind: "baska-gun" };
  const date = refs.length ? yesterday : ctx.today;
  const courseId = course && course !== "belirsiz" ? course.id : null;
  if (blocks && (blocks < 1 || blocks > 20)) return { kind: "yok" };
  if (courseId && blocks) return { kind: "kayit", entry: { date, courseId, blocks } };
  const pending = { kind: "calisma" as const, date, courseId, blocks: blocks ?? null };
  if (!courseId) return { kind: "sor", question: `${ctx.hitap}, hangi dersi çalıştınız?`.replace("çalıştınız", usesFormalYou(ctx.hitap) ? "çalıştınız" : "çalıştın"), pending };
  return { kind: "sor", question: `${ctx.hitap}, ${ctx.courses.find((c) => c.id === courseId)!.name} için kaç blok yazayım?`, pending };
}

/** Sorulan soruya cevap: ders adı ya da blok sayısı ("ayrık", "2", "iki blok"); biri hâlâ eksikse null. */
export function resolveStudyPending(pending: Extract<PendingLog, { kind: "calisma" }>, message: string, ctx: { courses: Course[]; blockMin: number }): StudyEntry | "vazgec" | "ilgisiz" {
  const t = normalizeTr(message);
  if (NEGATIVE.test(t) && t.split(" ").length <= 3) return "vazgec";
  if (message.includes("?") || t.split(" ").length > 6) return "ilgisiz";
  const course = pending.courseId ?? (() => {
    const c = findCourse(message, ctx.courses);
    return c && c !== "belirsiz" ? c.id : null;
  })();
  let blocks = pending.blocks ?? parseBlocks(message, ctx.blockMin);
  if (!blocks) {
    const n = t.match(/^(\d{1,2}|bir|iki|uc|dort|bes|alti|yedi|sekiz)$/);
    if (n) blocks = Number(n[1]) || ({ bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8 } as Record<string, number>)[n[1]];
  }
  if (!course || !blocks || blocks < 1 || blocks > 20) return "ilgisiz";
  return { date: pending.date, courseId: course, blocks };
}
