import { addDays } from "./time";
import { parseDayReferences } from "./day-ref";
import { normalizeTr } from "./text";
import type { RoutineItem } from "./types";

// Sohbetten rutin işaretleme (LLM'siz, deterministik). Mert "koştum, duş da
// aldım" derse kod bunu yakalar ve o günün rutin maddelerini işaretler.
// Asistan "Koşuyu yaptınız mı?" diye sorduysa "evet" cevabı da sayılır.
// Yanlış pozitif yanlış negatiften kötü: olumsuz ("koşmadım"), gelecek
// ("koşacağım"), soru ("koştum mu?") ve istek ("koşmalıyım") cümleleri atlanır.
// Her işaretleme sohbette "İşaretledim: …" satırı olarak görünür, geri alınabilir.

/** Geçmiş zaman 1. tekil/çoğul ek (normalize edilmiş): -dım/-tım/-dik/-mıştım… */
const PAST = "(?:d|t)[iu](?:m|k)";
const PAST_PERFECT = "m[iu]st[iu](?:m|k)";
const DONE_VERB = new RegExp(`\\b(?:yap|bitir|tamamla|hallet|kapat)(?:${PAST}|${PAST_PERFECT})\\b|\\b(?:bitti|tamamlandi|yapildi|tamamdir|tamam)\\b`);

interface ItemRule {
  /** Maddeyi adıyla anan kelimeler — genel "yaptım/bitirdim/tamam" fiiliyle birlikte sayılır */
  noun?: RegExp;
  /** Kendi başına "yaptım" anlamına gelen ifadeler ("koştum", "duş aldım") */
  verbs?: RegExp[];
  /** Genel fiil ("yaptım") bu madde için yeterli değil — yalnızca `verbs` (ör. "şu"/"su" karışmasın) */
  verbsOnly?: boolean;
  /** Her çekimiyle anılması ("koşmadım", "koştunuz mu?") — olumsuzluk ve soru için */
  stem: RegExp;
}

const RULES: Record<RoutineItem, ItemRule> = {
  uyanis: {
    stem: /\b(?:uyan|kalk)\w*/,
    verbs: [new RegExp(`\\b(?:uyand|kalkt)[iu](?:m|k)\\b`)],
  },
  buzlu_su: {
    stem: /\bbuz\w*/,
    noun: /\bbuz(?:lu|a|u)?\b/,
    verbs: [new RegExp(`\\bbuz\\w* .*\\b(?:sokt|daldird|batird|gird)[iu](?:m|k)\\b`)],
  },
  hidrasyon: {
    stem: /\b(?:(?:su|suyu|suyumu|suyunu)\b(?: \w+)? ic\w*|hidrasyon\w*)/,
    verbsOnly: true,
    verbs: [
      new RegExp(`\\b(?:su|suyu|suyumu|suyunu|bir bardak su|iki bardak su)\\b(?: \\w+)? ict[iu](?:m|k)\\b`),
      new RegExp(`\\bhidrasyon\\w*\\b.*\\b(?:yap|bitir|tamamla|hallet)(?:${PAST})\\b`),
    ],
  },
  soguk_dus: {
    stem: /\bdus(?:u|umu|umuzu|a|tan|unuzu)?\b/,
    noun: /\b(?:soguk )?dus(?:u|umu|umuzu)?\b/,
    verbs: [
      new RegExp(`\\bdus(?:u|umu|umuzu)? (?:da |de )?(?:al|yap)${PAST}\\b`),
      new RegExp(`\\bdusa gird[iu](?:m|k)\\b`),
      new RegExp(`\\bdustan c[iu]kt[iu](?:m|k)\\b`),
    ],
  },
  kosu: {
    stem: /\bkos\w*/,
    noun: /\bkosu(?:yu|mu|muzu|m)?\b/,
    verbs: [new RegExp(`\\bkos(?:${PAST}|${PAST_PERFECT})\\b`), new RegExp(`\\bkosu(?:dan|mdan)? (?:dond|geld)[iu](?:m|k)\\b`)],
  },
  yuruyus: {
    stem: /\byuru\w*/,
    noun: /\byuruyus(?:u|umu|umuzu)?\b/,
    verbs: [new RegExp(`\\byuru(?:${PAST}|${PAST_PERFECT})\\b`), new RegExp(`\\byuruyus(?:ten|umden) (?:dond|geld)[iu](?:m|k)\\b`)],
  },
  wall_sit: {
    stem: /\b(?:wall ?sit\w*|duvar\w*)\b/,
    noun: /\b(?:wall ?sit\w*|duvar oturus\w*|duvarda oturma\w*)\b/,
    verbs: [new RegExp(`\\bduvarda (?:oturd|bekled|durd)[iu](?:m|k)\\b`)],
  },
  su: {
    stem: /\b(?:su hedef\w*|gunluk su\w*|\d+(?: \d+)? (?:litre|lt))\b/,
    verbsOnly: true,
    verbs: [
      new RegExp(`\\b(?:su hedef\\w*|gunluk su\\w*|suyumu)\\b.*\\b(?:tamamla|bitir|doldur|yap|tuttur)(?:${PAST})\\b`),
      new RegExp(`\\b(?:su hedef\\w*|gunluk su\\w*) (?:tamam|tamamdir|bitti|doldu)\\b`),
      new RegExp(`\\b\\d+(?: \\d+)? (?:litre|lt) su ict[iu](?:m|k)\\b`),
    ],
  },
  temizlik: {
    stem: /\b(?:temizl\w*|bulasi\w*|camasi\w*|toz\w*|supur\w*|paspas\w*)\b/,
    noun: /\b(?:temizli\w*|bulasi\w*|camasi\w*|toz\w*|supurge\w*|paspas\w*)\b/,
    verbs: [
      new RegExp(`\\btemizled[iu](?:m|k)\\b`),
      new RegExp(`\\b(?:bulasi\\w*|camasi\\w*)\\b.*\\b(?:yikad|ast|katlad|toplad|bosaltt|doldurd|yerlestird|att|cikard)[iu](?:m|k)\\b`),
      new RegExp(`\\bsupurd[iu](?:m|k)\\b`),
      new RegExp(`\\btoz ald[iu](?:m|k)\\b`),
    ],
  },
};

const MORNING_ROUTINE: RoutineItem[] = ["uyanis", "buzlu_su", "hidrasyon", "soguk_dus"];

/** Olumsuz: "koşmadım", "almadım", "yapamadım", "hayır", "atladım"… */
const NEGATIVE = /m[ae]d[iu](?:m|k)\b|m[ae]m[iu]st[iu]|[ae]m[ae]d[iu]|\b(?:hayir|atlad\w*|kacird\w*|olmadi|yok|degil)\b/;
/** Gelecek / istek / koşul / soru: bunlar "yaptım" sayılmaz. */
const NOT_DONE =
  /[ae]c[ae](?:k|g)\w*|\b\w+(?<!ak)(?:sam|sem)\b|\b\w+(?:maliyim|meliyim|mali|meli)\b|\b(?:yarin|lazim|gerek|istiyorum|dusunuyorum|planliyorum|niyetim|birazdan|simdi cikiyorum)\b|\bm[iu](?:yim|sun|yiz|yum|yuz|sin)?\b/;
/** Soruya kısa olumlu cevap */
const AFFIRMATIVE = /^(?:evet|eveet|he|hi hi|tabii|tabi|elbette|aynen|yaptim|yapildi|hallettim|bitirdim|tamamladim|tamamdir|ikisini de|hepsini|hepsi)\b/;
const ALL_WORDS = /\b(?:hepsi\w*|ikisi\w*|ucu de|ucunu de|tumu\w*)\b/;

export interface DetectInput {
  message: string;
  /** Bu mesajdan hemen önceki asistan cevabı ("Koşuyu yaptınız mı?" gibi) */
  previousAssistant?: string | null;
  today: string;
  /** HH:MM (TR) */
  time: string;
  /** Tarih → o günün programındaki rutin maddeleri */
  itemsForDate: (date: string) => RoutineItem[];
}

export interface DetectResult {
  date: string;
  /** Söylenen ve o günün programında olan maddeler (sırasıyla) */
  items: RoutineItem[];
  /** Söylendi ama o günün programında yok (ör. yürüyüş gününde koşu) */
  notInPlan: RoutineItem[];
}

/** Ham metni cümle/yan cümle parçalarına böler; her parçanın soru olup olmadığı da döner. */
function clauses(message: string): { text: string; question: boolean }[] {
  const out: { text: string; question: boolean }[] = [];
  for (const m of message.matchAll(/[^.,;!?\n]+([.,;!?\n]*)/g)) {
    const question = m[1].includes("?");
    // Karşıtlık bağlacı ayrı yan cümle açar: "koştum ama duş almadım".
    for (const part of m[0].split(/(?<!\p{L})(?:ama|fakat|ancak|lakin|yalnız)(?!\p{L})/iu)) {
      const text = normalizeTr(part);
      if (text) out.push({ text, question });
    }
  }
  return out;
}

const ANY_PAST = new RegExp(`${PAST}\\b|${PAST_PERFECT}\\b|\\b(?:bitti|tamamlandi|yapildi|tamamdir|tamam)\\b`);

/**
 * "Yaptım" diyen yan cümleler (normalize edilmiş) — olumsuz, gelecek ve soru
 * olanlar hariç. Yapılacaklar listesindeki bir maddeyi sohbetten kapatmak için.
 */
export function doneClauses(message: string): string[] {
  return clauses(message)
    .filter((c) => !c.question && !NEGATIVE.test(c.text) && !NOT_DONE.test(c.text) && ANY_PAST.test(c.text))
    .map((c) => c.text);
}

function mentionedItems(text: string): RoutineItem[] {
  return (Object.keys(RULES) as RoutineItem[]).filter((item) => RULES[item].stem.test(text));
}

function doneItemsInClause(text: string): RoutineItem[] {
  if (NEGATIVE.test(text) || NOT_DONE.test(text)) return [];
  const found = new Set<RoutineItem>();
  const genericDone = text.match(DONE_VERB);
  for (const item of Object.keys(RULES) as RoutineItem[]) {
    const r = RULES[item];
    if ((r.verbs ?? []).some((v) => v.test(text))) {
      found.add(item);
      continue;
    }
    if (r.verbsOnly || !r.noun || !genericDone) continue;
    // Genel fiil maddeden SONRA gelmeli: "koşu tamam" evet, "tamam koşuya çıkıyorum" hayır.
    const noun = text.match(r.noun);
    if (noun && noun.index! < genericDone.index!) found.add(item);
  }
  if (/\bsabah rutin\w*\b/.test(text) && genericDone) for (const i of MORNING_ROUTINE) found.add(i);
  return [...found];
}

export function detectRoutineDone(input: DetectInput): DetectResult {
  const { today } = input;
  // Tarih: gün anılmadıysa bugün; tek bir yakın geçmiş gün anıldıysa ("dün yürüdüm") o gün.
  // Birden çok gün ya da 7 günden eski bir gün anıldıysa hiçbir şey işaretlenmez (belirsiz).
  const refs = parseDayReferences(input.message, today);
  if (refs.length > 1 || (refs.length === 1 && (refs[0] > today || refs[0] < addDays(today, -7)))) return { date: today, items: [], notInPlan: [] };
  const date = refs[0] ?? today;

  const parts = clauses(input.message);
  const said = new Set<RoutineItem>();
  for (const c of parts) {
    if (c.question) continue;
    for (const item of doneItemsInClause(c.text)) said.add(item);
  }

  // "Koşuyu yaptınız mı?" → "Evet" / "Hepsini yaptım"
  const prev = input.previousAssistant ?? "";
  if (prev.includes("?")) {
    const affirmed = parts.some((c) => !c.question && !NEGATIVE.test(c.text) && !NOT_DONE.test(c.text) && (AFFIRMATIVE.test(c.text) || ALL_WORDS.test(c.text)));
    const asked = clauses(prev).filter((c) => c.question).flatMap((c) => mentionedItems(c.text));
    if (affirmed) for (const i of asked) said.add(i);
  }

  // Açıkça olumsuz söylenen madde hiçbir yoldan işaretlenmez ("evet ama duş almadım").
  for (const c of parts) if (NEGATIVE.test(c.text)) for (const i of mentionedItems(c.text)) said.delete(i);

  // Uyanış ve sabah suyu sabah rutini: öğleden sonra "kalktım/su içtim" başka anlama gelir.
  const morning = input.time < "12:00" || date !== today || /\bsabah\b/.test(normalizeTr(input.message));
  if (!morning) {
    said.delete("uyanis");
    said.delete("hidrasyon");
  }
  // "2 litre su içtim" günlük su hedefidir, sabahki bardak değil.
  if (said.has("su")) said.delete("hidrasyon");

  const plan = new Set(input.itemsForDate(date));
  const ordered = (Object.keys(RULES) as RoutineItem[]).filter((i) => said.has(i));
  return { date, items: ordered.filter((i) => plan.has(i)), notInPlan: ordered.filter((i) => !plan.has(i)) };
}
