import type { Client } from "@libsql/client";
import type { AssistantSettings } from "@/lib/assistant/config";
import type { DailyBrief } from "@/lib/assistant/daily";
import { DAY_TYPE_LABELS, dayTypeFor, ROUTINE_LABELS, routineItemsForDay, scheduleForDay } from "@/lib/assistant/daily";
import { parseDayReferences } from "@/lib/assistant/day-ref";
import { describeStudyForModel } from "@/lib/assistant/study";
import { buildExtractionPrompt, EXTRACTION_RESPONSE_SCHEMA, extractionSchema, filterExtractedNotes, MEMORY_CATEGORY_LABELS } from "@/lib/assistant/memory-extract";
import { MEAL_TYPE_LABELS } from "@/lib/assistant/meals";
import { checkOutput } from "@/lib/assistant/output-check";
import {
  detectMealLog,
  formatMealLine,
  isBareDone,
  isUndoCommand,
  mentionsEating,
  resolvePending,
  type KnownMeal,
  type MealContext,
  type MealEntry,
  type PendingLog,
  type PendingResolution,
} from "@/lib/assistant/log-intent";
import { CHAT_MARKABLE, detectRoutineDone, doneClauses } from "@/lib/assistant/routine-detect";
import { extractTodoMarker, userAcceptedTodo, type TodoProposal } from "@/lib/assistant/todo-marker";
import {
  buildSystemPrompt,
  LLM_DOWN_MESSAGE,
  MAX_OUTPUT_TOKENS,
  NOT_CONFIGURED_MESSAGE,
  pickTone,
  QUOTA_MESSAGE,
  type ChatMode,
} from "@/lib/assistant/persona";
import { contentWords, formatTrDate, normalizeTr } from "@/lib/assistant/text";
import { addDays, isoWeekday, istanbulNow, weekdayName } from "@/lib/assistant/time";
import type { MealLogRow, RoutineItem, RoutineLogRow, TodoItem } from "@/lib/assistant/types";
import { addMealLog, deleteMealLog, getDailyBrief, getSettings, listMealLog, listMeals, listRoutineLog, listSchedule, setRoutineDone } from "./assistant-repo";
import {
  addMessage,
  createConversation,
  getConversation,
  getMessage,
  listIdleUnextracted,
  listMessages,
  markMemoryExtracted,
  setSummary,
  updateMessage,
  type ChatMessage,
  type Conversation,
} from "./chat-repo";
import type { LlmFn, LlmRequest } from "./gemini";
import { addMemory, deleteMemory, listActiveMemories, searchMemories } from "./memory-repo";
import { addTodo, deleteTodo, findSameTodo, listTodos, setTodoDone } from "./todo-repo";

// Sohbet orkestrasyonu (§ 7). Veritabanı ve LLM fonksiyonu parametre olarak
// gelir — testlerde sahte LLM ile kod yolları doğrulanır (kalite DEĞİL;
// kalite gerçek Gemini ile senaryo setinde ölçülür, bkz. scenarios/).

/** Son kaç ham mesaj bağlama girer (§ 7.1: 6–8). */
export const RAW_HISTORY = 8;
/** Özetlenmemiş mesaj sayısı bunu geçince eskiler özetlenir. */
export const SUMMARIZE_AFTER = 16;
/** Bu kadar dakika sessiz kalan sohbetten hafıza çıkarılır (§ 7.3). */
export const IDLE_EXTRACT_MINUTES = 20;
/** Bu kadar saat sessiz kalan sohbete yeni mesaj gelirse yeni sohbet açılır. */
export const NEW_CONVERSATION_HOURS = 6;

export interface ChatDeps {
  db: Client;
  llm: LlmFn;
  fts: boolean;
  now?: Date;
}

export interface Models {
  chat: string[];
  light: string[];
}

export function modelsFrom(settings: AssistantSettings): Models {
  // Sohbet modelinin kotası dolarsa hafif modele düşülür (kotayı korur, hata vermez).
  return { chat: [...new Set([settings.modelChat, settings.modelLight])], light: [settings.modelLight] };
}

// ---------------------------------------------------------------------------
// Bağlam paketi (§ 7.1)

function describeTodo(t: TodoItem): string {
  return `${t.time ?? "gün içinde"} ${t.title}${t.done ? " (yapıldı)" : " (yapılmadı)"}`;
}

/** `upcoming`: yarından itibaren ~1 haftalık yapılacaklar (Mert "yarın ne var?" diyebilir). */
export function describeToday(brief: DailyBrief, upcoming: TodoItem[] = []): string {
  const done = brief.schedule.filter((s) => s.done).map((s) => s.title);
  const pending = brief.schedule.filter((s) => s.done === false && s.time <= brief.time).map((s) => `${s.time} ${s.title}`);
  const meals = brief.meals
    .map((m) => {
      if (m.logged) return `${m.label}: yendi — ${m.logged.name}${m.logged.isLeftover ? " (kalan)" : ""}`;
      const s = m.suggestion;
      // Pişirme tarihi açıkça yazılır — yoksa model "dünden kalan" diye tahmin ediyordu.
      if (s.kind === "kalan")
        return `${m.label}: öneri — kalan ${s.meal.name} (pişirme: ${formatTrDate(s.cookedOn)}, ${s.remaining} porsiyon${s.meal.reheat ? `, ${s.meal.reheat}` : ""})`;
      if (s.kind === "yeni") return `${m.label}: öneri — ${s.meal.name} (${s.meal.durationMin} dk${s.meal.servings > 1 ? `, ${s.meal.servings} öğüne yeter` : ""})`;
      return `${m.label}: öneri yok (${s.reason})`;
    })
    .join("; ");
  const w = brief.week;
  return [
    `Tarih: ${formatTrDate(brief.date)} ${brief.weekdayName} (${brief.date}), saat ${brief.time} (Türkiye).`,
    `Gün tipi: ${brief.dayTypeLabel} — ${brief.plan}.`,
    `Yapılanlar: ${done.length ? done.join(", ") : "henüz yok"}.`,
    pending.length ? `Saati geçmiş ama işaretlenmemiş: ${pending.join(", ")}.` : "",
    `Öğünler: ${meals}.`,
    `Temizlik: ${brief.chores.map((c) => c.title).join(", ")}${brief.choreDone ? " (yapıldı)" : ""}.`,
    `Yapılacaklar listesi (bugün): ${brief.todos?.length ? brief.todos.map(describeTodo).join("; ") : "boş"}.`,
    upcoming.length ? `Yaklaşan yapılacaklar: ${upcoming.map((t) => `${formatTrDate(t.date)} ${weekdayName(isoWeekday(t.date))} ${describeTodo(t)}`).join("; ")}.` : "",
    `Bu hafta: koşu ${w.runs.done}/${w.runs.planned}, yürüyüş ${w.walks.done}/${w.walks.planned}, rutin %${w.routinePct}, öğün kaydı ${w.mealLogs.count}.`,
    `Projeler: GitHub bağlantısı henüz yok — proje durumu bilinmiyor.`,
    brief.study ? describeStudyForModel(brief.study) : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function describeDay(date: string, meals: MealLogRow[], routine: RoutineLogRow[]): string {
  const m = meals.filter((r) => r.date === date);
  const r = routine.filter((x) => x.date === date && x.done);
  const head = `${formatTrDate(date)} ${weekdayName(isoWeekday(date))} (${date}, ${DAY_TYPE_LABELS[dayTypeFor(date)]})`;
  const mealText = m.length
    ? m.map((x) => `${MEAL_TYPE_LABELS[x.mealType]}: ${x.mealName}${x.isLeftover ? " (kalan)" : ""}${x.rating ? ` (puan ${x.rating}/5)` : ""}${x.note ? ` — not: ${x.note}` : ""}`).join("; ")
    : "öğün kaydı yok";
  const routineText = r.length ? r.map((x) => ROUTINE_LABELS[x.item]).join(", ") : "rutin kaydı yok";
  return `${head}: ${mealText}. Rutin: ${routineText}.`;
}

/** Sorulan günlerin kesin kayıtları + son 3 gün + mesajla ilgili eski öğün kayıtları. */
export async function buildFacts(db: Client, message: string, today: string): Promise<{ text: string; mealNames: string[] }> {
  const asked = parseDayReferences(message, today).filter((d) => d < today);
  // Son 60 gün + (daha eskiyse) sorulan en eski gün okunur — eski bir tarih sorulunca "kayıt yok" yanlışlıkla denmesin.
  const from = [addDays(today, -60), ...asked].sort()[0];
  const [meals, routine] = await Promise.all([listMealLog(db, from, today), listRoutineLog(db, from, today)]);
  const lines: string[] = [];

  for (const d of asked) lines.push(`Sorulan gün → ${describeDay(d, meals, routine)}`);

  const recent = [1, 2, 3].map((n) => addDays(today, -n)).filter((d) => !asked.includes(d));
  lines.push(...recent.map((d) => `Son günler → ${describeDay(d, meals, routine)}`));

  // Mesajdaki kelimelerle eşleşen eski öğün kayıtları ("en son ne zaman menemen yedim?")
  const words = contentWords(message).map((w) => w.slice(0, 5));
  if (words.length) {
    const related = meals
      .filter((r) => r.date < addDays(today, -3))
      .filter((r) => words.some((w) => normalizeTr(`${r.mealName} ${r.note ?? ""}`).includes(w)))
      .slice(-5);
    for (const r of related) lines.push(`İlgili kayıt → ${formatTrDate(r.date)} (${r.date}) ${MEAL_TYPE_LABELS[r.mealType]}: ${r.mealName}${r.rating ? ` (puan ${r.rating}/5)` : ""}`);
  }

  const first = (await db.execute(`SELECT MIN(date) AS d FROM meal_log WHERE deleted_at IS NULL`)).rows[0]?.d;
  lines.push(first ? `İlk öğün kaydı: ${formatTrDate(String(first))} ${String(first).slice(0, 4)}. Bundan önceki günler için kayıt yok.` : "Henüz hiç öğün kaydı yok.");
  return { text: lines.join("\n"), mealNames: [...new Set(meals.map((r) => r.mealName))] };
}

function toContents(history: ChatMessage[]): LlmRequest["contents"] {
  const out: LlmRequest["contents"] = [];
  for (const m of history) {
    if (m.role === "not" || m.meta?.system) continue;
    const role = m.role === "user" ? "user" : "model";
    const last = out.at(-1);
    if (last && last.role === role) last.text += `\n${m.content}`;
    else out.push({ role, text: m.content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

// ---------------------------------------------------------------------------
// Sohbetten günlük kayıt (görev dosyası istisnası: "yapıldı" kaydı + öğün kaydı).
// Niyeti de kaydı da KOD yapar (routine-detect.ts, log-intent.ts); model yalnızca
// kısaca onaylar. Belirsizse kod tek kısa soru sorar, cevap gelince yazar.

export interface ChatMarks {
  /** "İşaretledim: …" satırı — yeni bir şey işaretlendiyse/kaydedildiyse */
  message: ChatMessage | null;
  /** Modele giden kısa açıklama (yoksa boş) */
  context: string;
  /** Belirsiz: modelin yerine sorulacak tek kısa soru (cevap gelince kod yazar) */
  ask: { question: string; pending: PendingLog } | null;
}

const lower = (s: string) => s.toLocaleLowerCase("tr-TR");

function routineLabels(items: RoutineItem[]): string {
  return items.map((i) => lower(ROUTINE_LABELS[i])).join(", ");
}

/** Başlığın anlamlı kelime kökleri (4 harf) — "20 dk hafif yürüyüş" → hafi, yuru */
function titleStems(title: string): string[] {
  return contentWords(title)
    .filter((w) => w.length >= 3 && !/^\d/.test(w) && w !== "dk" && w !== "dakika")
    .map((w) => w.slice(0, 4));
}

/** Bugünün yapılmamış maddelerinden, "yaptım" diyen bir yan cümlede kökü geçenler. */
function matchDoneTodos(todos: TodoItem[], message: string): TodoItem[] {
  const said = doneClauses(message).map((c) => c.split(" ").map((w) => w.slice(0, 4)));
  if (!said.length) return [];
  return todos.filter((t) => !t.done && said.some((words) => titleStems(t.title).some((st) => words.includes(st))));
}

/** Bilinen yemek adları: tarif listesi + son 60 günün kayıtları (aynı ad bir kez). */
async function knownMeals(db: Client, today: string): Promise<KnownMeal[]> {
  const [meals, log] = await Promise.all([listMeals(db), listMealLog(db, addDays(today, -60), today)]);
  const seen = new Set<string>();
  return [...meals.map((m) => ({ id: m.id, name: m.name })), ...log.map((r) => ({ id: r.mealId, name: r.mealName }))].filter((k) => {
    const key = normalizeTr(k.name);
    return !seen.has(key) && Boolean(seen.add(key));
  });
}

async function mealContext(db: Client, now: { date: string; time: string }, hitap: string, previous: ChatMessage | null): Promise<MealContext> {
  const [brief, known] = await Promise.all([getDailyBrief(db, now.date, now.time), knownMeals(db, now.date)]);
  const suggestions: MealContext["suggestions"] = {};
  for (const m of brief.meals) {
    if (m.suggestion.kind !== "yok") suggestions[m.mealType] = { id: m.suggestion.meal.id, name: m.suggestion.meal.name, leftover: m.suggestion.kind === "kalan" };
  }
  return { today: now.date, time: now.time, hitap, known, suggestions, previous: previous ? { content: previous.content, proactive: previous.meta?.proactive ?? null } : null };
}

/** Öğün kaydını yazar; aynı gün aynı öğünde aynı yemek zaten varsa yazmaz (null). */
async function writeMeal(db: Client, e: MealEntry): Promise<number | null> {
  const same = (await listMealLog(db, e.date, e.date)).some((r) => r.mealType === e.mealType && normalizeTr(r.mealName) === normalizeTr(e.mealName));
  if (same) return null;
  return addMealLog(db, e, "sohbet");
}

/** "İşaretledim: koşu, soğuk duş, öğle — menemen (4/5)" satırı — geri alınabilir. */
async function addMarkLine(
  db: Client,
  conversationId: string,
  p: { date: string; today: string; routine: RoutineItem[]; todos: TodoItem[]; meal: MealEntry | null; mealLogId: number | null },
): Promise<ChatMessage | null> {
  const labels = [...(p.routine.length ? [routineLabels(p.routine)] : []), ...p.todos.map((t) => t.title), ...(p.meal && p.mealLogId ? [formatMealLine(p.meal)] : [])].join(", ");
  if (!labels) return null;
  const dayNote = p.date === p.today ? "" : ` (${formatTrDate(p.date)})`;
  return addMessage(db, {
    conversationId,
    role: "not",
    content: `İşaretledim${dayNote}: ${labels}`,
    mode: "yazi",
    meta: {
      routine: { date: p.date, items: p.routine },
      ...(p.todos.length ? { todosDone: p.todos.map((t) => t.id) } : {}),
      ...(p.mealLogId ? { mealLogId: p.mealLogId } : {}),
    },
  });
}

/**
 * Mert'in "koştum, duş aldım", "öğlen menemen yedim, 4 puan" gibi cümlelerini KOD
 * yakalar ve modelden ÖNCE yazar — böylece model "işaretledim" diyebilir, "Bugün
 * ekranından işaretleyin" demez. Zaten işaretli olan tekrar yazılmaz. Bugünün
 * yapılacaklarından adı geçen ("akşam yürüyüşünü yaptım") da kapatılır.
 */
export async function logFromChat(
  db: Client,
  conversationId: string,
  history: ChatMessage[],
  message: string,
  now: { date: string; time: string },
  hitap: string,
): Promise<ChatMarks> {
  const lastAssistant = history.filter((m) => m.role === "assistant" && !m.meta?.system).at(-1) ?? null;
  const previousAssistant = lastAssistant?.content ?? null;
  const [schedule, todayTodos] = await Promise.all([listSchedule(db), listTodos(db, now.date, now.date)]);
  const found = detectRoutineDone({ message, previousAssistant, today: now.date, time: now.time, itemsForDate: (d) => routineItemsForDay(schedule, dayTypeFor(d)) });
  const todos = matchDoneTodos(todayTodos, message);
  const lines: string[] = [];
  let ask: ChatMarks["ask"] = null;
  let items = found.items;

  // Tek başına "yaptım": planlı spor konuşmasına cevapsa günün sporu; değilse saati geçmiş son açık madde SORULUR.
  if (!items.length && !todos.length && isBareDone(message) && !(previousAssistant ?? "").includes("?")) {
    const done = new Set((await listRoutineLog(db, now.date, now.date)).filter((r) => r.done).map((r) => r.item));
    const sport: RoutineItem = dayTypeFor(now.date) === "kosu" ? "kosu" : "yuruyus";
    if (lastAssistant?.meta?.proactive === "spor" && !done.has(sport)) items = [sport];
    else {
      const candidate = scheduleForDay(schedule, dayTypeFor(now.date))
        .filter((s) => s.routineItem && CHAT_MARKABLE.includes(s.routineItem) && s.time <= now.time && !done.has(s.routineItem))
        .at(-1)?.routineItem;
      if (candidate) ask = { question: `${hitap}, işaretleyeyim mi: ${lower(ROUTINE_LABELS[candidate])}?`, pending: { kind: "rutin", date: now.date, items: [candidate] } };
    }
  }

  let meal: MealEntry | null = null;
  if (mentionsEating(message)) {
    const r = detectMealLog(message, await mealContext(db, now, hitap, lastAssistant));
    if (r.kind === "kayit") meal = r.entry;
    else if (r.kind === "sor" && !message.includes("?")) ask ??= { question: r.question, pending: r.pending };
    else if (r.kind === "baska-gun") lines.push("Öğün yalnızca bugün ya da dün için kaydedilir; başka bir gün söylendiği için kaydedilmedi — kısaca söyle.");
  }

  const doneBefore = items.length ? new Set((await listRoutineLog(db, found.date, found.date)).filter((r) => r.done).map((r) => r.item)) : new Set<RoutineItem>();
  const fresh = items.filter((i) => !doneBefore.has(i));
  const already = items.filter((i) => doneBefore.has(i));
  for (const item of fresh) await setRoutineDone(db, found.date, item, true, "sohbet");
  for (const t of todos) await setTodoDone(db, t.id, true);
  const mealLogId = meal ? await writeMeal(db, meal) : null;

  const date = fresh.length || todos.length ? found.date : (meal?.date ?? found.date);
  const note = await addMarkLine(db, conversationId, { date, today: now.date, routine: fresh, todos, meal, mealLogId });
  const dayNote = date === now.date ? "" : ` (${formatTrDate(date)})`;
  // Programda olmayan madde listedeki bir işle kapandıysa ("yürüdüm" → "20 dk hafif yürüyüş") ayrıca uyarma.
  const notInPlan = found.notInPlan.filter((i) => !todos.length || !titleStems(ROUTINE_LABELS[i]).some((st) => todos.some((t) => titleStems(t.title).includes(st))));
  if (note) lines.unshift(`Sistem az önce işaretledi${dayNote}: ${note.content.slice(note.content.indexOf(": ") + 2)}. Kısaca onayla ("İşaretledim").`);
  if (already.length) lines.push(`Zaten işaretliydi${dayNote}: ${routineLabels(already)}.`);
  if (meal && !mealLogId) lines.push(`Zaten kayıtlıydı: ${formatMealLine(meal)}.`);
  if (notInPlan.length) lines.push(`${ROUTINE_LABELS[notInPlan[0]]}${notInPlan.length > 1 ? `, ${routineLabels(notInPlan.slice(1))}` : ""} o günün programında yok — işaretlenmedi.`);
  if (found.notAllowed?.length) lines.push("Temizlik sohbetten işaretlenmez, yalnızca Bugün ekranından — bunu kısaca söyle.");
  if (found.otherDay) lines.push("Sohbetten yalnızca bugün ve dün işaretlenir; başka bir gün söylendiği için işaretlenmedi — kısaca söyle.");
  return { message: note, context: lines.join("\n"), ask };
}

/** Bugün / yarın / "27 Ekim" */
function dayLabel(date: string, today: string): string {
  if (date === today) return "bugün";
  if (date === addDays(today, 1)) return "yarın";
  return `${formatTrDate(date)} ${weekdayName(isoWeekday(date))}`;
}

/**
 * Modelin cevabındaki [[YAPILACAK …]] önerisini listeye ekler — yalnızca Mert'in
 * son mesajı kabul/zaman bildiriyorsa (todo-marker.ts). Aynı gün aynı başlık varsa eklemez.
 */
async function addTodoFromChat(db: Client, conversationId: string, proposal: TodoProposal | null, message: string, today: string): Promise<ChatMessage | null> {
  if (!proposal || !userAcceptedTodo(message)) return null;
  if (await findSameTodo(db, proposal.date, proposal.title)) return null;
  const todo = await addTodo(db, proposal, "sohbet");
  const when = `${dayLabel(todo.date, today)}${todo.time ? ` ${todo.time}` : ""}`;
  return addMessage(db, { conversationId, role: "not", content: `Listeye ekledim: ${todo.title} — ${when}`, mode: "yazi", meta: { todoId: todo.id } });
}

/** Sohbetteki sistem satırının işlemini geri alır: işaretleme, öğün kaydı ya da listeye ekleme. */
export async function undoChatAction(db: Client, messageId: number): Promise<ChatMessage | null> {
  const m = await getMessage(db, messageId);
  if (!m || m.role !== "not" || !(m.meta?.routine || m.meta?.todoId || m.meta?.mealLogId)) return null;
  let content: string;
  if (m.meta.todoId) {
    await deleteTodo(db, m.meta.todoId);
    content = m.content.replace(/^Listeye ekledim/, "Listeden çıkarıldı");
  } else {
    const { date, items } = m.meta.routine ?? { date: "", items: [] };
    for (const item of items) await setRoutineDone(db, date, item, false, "sohbet");
    for (const id of m.meta.todosDone ?? []) await setTodoDone(db, id, false);
    if (m.meta.mealLogId) await deleteMealLog(db, m.meta.mealLogId);
    content = m.content.replace(/^İşaretledim/, "İşaretleme geri alındı");
  }
  await updateMessage(db, m.id, content, { routineUndone: true });
  return { ...m, content, meta: { routineUndone: true } };
}

/** "Geri al" komutu: bu sohbetteki son (henüz geri alınmamış) kayıt satırı. */
async function undoLast(db: Client, history: ChatMessage[]): Promise<ChatMessage | null> {
  const last = history.filter((m) => m.role === "not" && (m.meta?.routine || m.meta?.todoId || m.meta?.mealLogId)).at(-1);
  return last ? undoChatAction(db, last.id) : null;
}

/** Sorulan tek soruya gelen cevabı uygular; ekrana gidecek kısa cevabı ve kayıt satırını döner. */
async function applyResolution(
  db: Client,
  conversationId: string,
  r: Extract<PendingResolution, { kind: "ogun" | "rutin" }>,
  today: string,
  hitap: string,
): Promise<{ note: ChatMessage | null; text: string }> {
  if (r.kind === "ogun") {
    const id = await writeMeal(db, r.entry);
    if (!id) return { note: null, text: `${hitap}, bu zaten kayıtlı: ${formatMealLine(r.entry)}.` };
    const note = await addMarkLine(db, conversationId, { date: r.entry.date, today, routine: [], todos: [], meal: r.entry, mealLogId: id });
    return { note, text: `Tamam ${hitap}, yazdım.` };
  }
  const done = new Set((await listRoutineLog(db, r.date, r.date)).filter((x) => x.done).map((x) => x.item));
  const fresh = r.items.filter((i) => !done.has(i));
  for (const item of fresh) await setRoutineDone(db, r.date, item, true, "sohbet");
  const note = await addMarkLine(db, conversationId, { date: r.date, today, routine: fresh, todos: [], meal: null, mealLogId: null });
  return { note, text: fresh.length ? `Tamam ${hitap}, işaretledim.` : `${hitap}, o zaten işaretliydi.` };
}

// ---------------------------------------------------------------------------
// Ana akış

export interface ChatResult {
  conversationId: string;
  userMessage: ChatMessage;
  /** Sohbetten işaretleme satırı ("İşaretledim: Koşu") — kullanıcı mesajı ile cevap arasında */
  marks: ChatMessage | null;
  reply: ChatMessage;
  /** Sohbetten listeye ekleme satırı ("Listeye ekledim: …") — cevaptan sonra */
  todo: ChatMessage | null;
  /** "Geri al" komutuyla geri alınan eski satırın yeni hâli (ekranda yerinde güncellenir) */
  undone: ChatMessage | null;
  /** Yeniden üretildi mi (§ 7.5) */
  regenerated: boolean;
  /** Çıktı kontrolünde kalan sorunlar (2. denemeden sonra) — raporlama/test için */
  problems: string[];
  /** LLM'e gidemediysek neden */
  failure?: "kota" | "ag" | "yapilandirma" | "hata";
}

export async function handleChat(
  deps: ChatDeps,
  input: { conversationId?: string | null; message: string; mode: ChatMode },
): Promise<ChatResult> {
  const { db, llm, fts } = deps;
  const nowDate = deps.now ?? new Date();
  const now = istanbulNow(nowDate);

  let conversation: Conversation | null = input.conversationId ? await getConversation(db, input.conversationId) : null;
  if (conversation && nowDate.getTime() - Date.parse(conversation.updatedAt) > NEW_CONVERSATION_HOURS * 3_600_000) conversation = null;
  if (!conversation) conversation = await createConversation(db);

  const history = await listMessages(db, conversation.id);
  const userMessage = await addMessage(db, { conversationId: conversation.id, role: "user", content: input.message, mode: input.mode });
  const settings = await getSettings(db);
  const conversationId = conversation.id;
  // Koddan kısa cevap (model yok): "geri al", belirsizlik sorusu ve sorunun cevabı.
  const direct = async (content: string, marks: ChatMessage | null, undone: ChatMessage | null = null, meta: ChatMessage["meta"] = null): Promise<ChatResult> => ({
    conversationId,
    userMessage,
    marks,
    reply: await addMessage(db, { conversationId, role: "assistant", content, mode: input.mode, meta }),
    todo: null,
    undone,
    regenerated: false,
    problems: [],
  });

  // 1) "Geri al": bu sohbetteki son kayıt silinir.
  if (isUndoCommand(input.message)) {
    const undone = await undoLast(db, history);
    return direct(undone ? `Geri aldım: ${undone.content.slice(undone.content.indexOf(": ") + 2)}.` : "Geri alınacak bir kayıt yok.", null, undone);
  }

  // 2) Az önce sorulan tek soruya cevap ("Menemen öğle yemeği olarak mı yazayım?" → "evet" / "hayır, akşam").
  const lastTurn = history.filter((m) => m.role !== "not").at(-1);
  const pending = lastTurn?.role === "assistant" ? lastTurn.meta?.pending : undefined;
  if (pending) {
    const r = resolvePending(pending, input.message, pending.kind === "ogun" ? await knownMeals(db, now.date) : []);
    if (r.kind === "vazgec") return direct(pending.kind === "ogun" ? "Tamam, yazmadım." : "Tamam, işaretlemedim.", null);
    if (r.kind !== "ilgisiz") {
      const applied = await applyResolution(db, conversationId, r, now.date, settings.hitap);
      return direct(applied.text, applied.note);
    }
  }

  // 3) Önce kaydet, sonra bugünün özetini oku — model güncel durumu görsün. Belirsizse kod tek soru sorar.
  const marks = await logFromChat(db, conversationId, history, input.message, now, settings.hitap);
  if (marks.ask) return direct(marks.ask.question, marks.message, null, { pending: marks.ask.pending });

  const models = modelsFrom(settings);
  const [brief, upcoming, facts, memories, allMessages, meals] = await Promise.all([
    getDailyBrief(db, now.date, now.time),
    listTodos(db, addDays(now.date, 1), addDays(now.date, 7)),
    buildFacts(db, input.message, now.date),
    searchMemories(db, input.message, fts),
    listMessages(db, conversation.id),
    listMeals(db),
  ]);

  const today = describeToday(brief, upcoming);
  const system = buildSystemPrompt({
    hitap: settings.hitap,
    tone: pickTone(now.time, input.message),
    mode: input.mode,
    today,
    facts: facts.text,
    memories: memories.map((m) => `[${MEMORY_CATEGORY_LABELS[m.category]}] ${m.text}`),
    summary: conversation.summary,
    marks: marks.context,
  });
  const contents = toContents(allMessages.slice(-RAW_HISTORY));
  const contextText = `${today}\n${facts.text}\n${memories.map((m) => m.text).join("\n")}\n${conversation.summary ?? ""}\n${allMessages.map((m) => m.content).join("\n")}`;
  const knownMealNames = [...new Set([...meals.map((m) => m.name), ...facts.mealNames])];

  const request: LlmRequest = { models: models.chat, system, contents, maxOutputTokens: MAX_OUTPUT_TOKENS[input.mode] };
  const result = await llm(request);
  let regenerated = false;
  let problems: string[] = [];
  let text: string;
  let proposal: TodoProposal | null = null;

  if (!result.ok) {
    text = result.reason === "kota" ? QUOTA_MESSAGE : result.reason === "yapilandirma" ? NOT_CONFIGURED_MESSAGE : LLM_DOWN_MESSAGE;
  } else {
    // [[YAPILACAK …]] satırı her durumda cevaptan ayrılır; öneri ayrıca doğrulanıp eklenir.
    const check = (r: { text: string; truncated?: boolean }) => {
      const marker = extractTodoMarker(r.text, now.date);
      proposal = marker.proposal;
      return checkOutput({ text: marker.text, truncated: r.truncated, mode: input.mode, hitap: settings.hitap, context: contextText, knownMealNames });
    };
    let checked = check(result);
    if (checked.problems.length) {
      regenerated = true;
      const retry = await llm({ ...request, system: `${system}\n\n# DÜZELT (önceki cevabında sorun vardı)\n${checked.problems.join("\n")}` });
      if (retry.ok) checked = check(retry);
    }
    text = checked.text;
    problems = checked.problems;
  }

  const reply = await addMessage(db, {
    conversationId: conversation.id,
    role: "assistant",
    content: text,
    mode: input.mode,
    meta: result.ok ? null : { system: true },
  });
  const todo = await addTodoFromChat(db, conversation.id, proposal, input.message, now.date);
  return { conversationId: conversation.id, userMessage, marks: marks.message, reply, todo, undone: null, regenerated, problems, failure: result.ok ? undefined : result.reason };
}

// ---------------------------------------------------------------------------
// Arka plan işleri (cevap gönderildikten sonra çalışır — next/server `after`)

/** Uzayan sohbette eski mesajları hafif modelle özete çevirir (§ 7.1 madde 4). */
export async function summarizeIfNeeded(deps: ChatDeps, conversationId: string): Promise<boolean> {
  const { db, llm } = deps;
  const conversation = await getConversation(db, conversationId);
  if (!conversation) return false;
  const msgs = (await listMessages(db, conversationId)).filter((m) => m.role !== "not" && !m.meta?.system && m.id > conversation.summarizedUpto);
  if (msgs.length <= SUMMARIZE_AFTER) return false;
  const toSummarize = msgs.slice(0, msgs.length - RAW_HISTORY);
  const settings = await getSettings(db);
  const res = await llm({
    models: modelsFrom(settings).light,
    system:
      "Bir sohbetin eski kısmını özetliyorsun. Türkçe, en fazla 5 kısa cümle. Sadece konuşulan somut bilgileri yaz (ne soruldu, ne önerildi, ne karar verildi). Yeni bilgi ekleme.",
    contents: [
      {
        role: "user",
        text: `${conversation.summary ? `Önceki özet: ${conversation.summary}\n\n` : ""}${toSummarize.map((m) => `${m.role === "user" ? "Mert" : "Asistan"}: ${m.content}`).join("\n")}`,
      },
    ],
    maxOutputTokens: 400,
    temperature: 0.2,
  });
  if (!res.ok) return false;
  await setSummary(db, conversationId, res.text.slice(0, 1200), toSummarize.at(-1)!.id);
  return true;
}

export interface ExtractedMemoryNote {
  memoryId: number;
  text: string;
}

/** Sohbetten kalıcı notları çıkarır, "Not aldım: …" satırını sohbete ekler (§ 7.3). */
export async function extractMemories(deps: ChatDeps, conversationId: string): Promise<ExtractedMemoryNote[]> {
  const { db, llm, fts } = deps;
  const conversation = await getConversation(db, conversationId);
  if (!conversation) return [];
  const since = conversation.memoryExtractedAt ?? "";
  const msgs = (await listMessages(db, conversationId)).filter((m) => (m.role === "user" || m.role === "assistant") && !m.meta?.system && m.createdAt > since);
  const userText = msgs.filter((m) => m.role === "user").map((m) => m.content).join("\n");
  if (!userText.trim()) {
    await markMemoryExtracted(db, conversationId);
    return [];
  }

  const settings = await getSettings(db);
  const prompt = buildExtractionPrompt(msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
  const res = await llm({
    models: modelsFrom(settings).light,
    system: prompt.system,
    contents: [{ role: "user", text: prompt.user }],
    maxOutputTokens: 800,
    temperature: 0.1,
    responseSchema: EXTRACTION_RESPONSE_SCHEMA,
  });
  if (!res.ok) return []; // kota/ağ: işaretlemiyoruz, sonra yeniden denenir

  let parsed;
  try {
    parsed = extractionSchema.safeParse(JSON.parse(res.text));
  } catch {
    parsed = null;
  }
  if (!parsed?.success) {
    await markMemoryExtracted(db, conversationId);
    return [];
  }

  const existing = (await listActiveMemories(db)).map((m) => m.text);
  const accepted = filterExtractedNotes({ notes: parsed.data.notlar, userText, existing });
  const out: ExtractedMemoryNote[] = [];
  for (const n of accepted) {
    const id = await addMemory(db, { category: n.kategori, text: n.metin, sourceConversationId: conversationId, confidence: n.guven }, fts);
    await addMessage(db, { conversationId, role: "not", content: `Not aldım: ${n.metin}`, mode: "yazi", meta: { memoryId: id } });
    out.push({ memoryId: id, text: n.metin });
  }
  // "Not aldım" satırları updated_at'i ilerletir; işaret EN SON konur ki tekrar çıkarılmasın.
  await markMemoryExtracted(db, conversationId);
  return out;
}

/** Sessiz kalmış (≥20 dk) ve henüz hafızası çıkarılmamış sohbetleri işler. */
export async function extractIdleConversations(deps: ChatDeps, exceptId?: string) {
  for (const c of await listIdleUnextracted(deps.db, IDLE_EXTRACT_MINUTES, exceptId)) {
    await extractMemories(deps, c.id);
  }
  await consolidateOldMemories(deps);
}

/**
 * 90 günden eski, hiç kullanılmamış küçük notları kategori bazında tek nota
 * özetler (§ 7.3). Özet, eski notlarda olmayan kelime içeremez (kod kontrolü).
 */
export async function consolidateOldMemories(deps: ChatDeps): Promise<number> {
  const { db, llm, fts } = deps;
  const cutoff = new Date((deps.now ?? new Date()).getTime() - 90 * 86_400_000).toISOString();
  const old = (await listActiveMemories(db)).filter((m) => m.createdAt < cutoff && !m.lastUsedAt && m.text.length < 80);
  const groups = new Map<string, typeof old>();
  for (const m of old) groups.set(m.category, [...(groups.get(m.category) ?? []), m]);

  let merged = 0;
  const settings = await getSettings(db);
  for (const [category, notes] of groups) {
    if (notes.length < 3) continue;
    const res = await llm({
      models: modelsFrom(settings).light,
      system: "Aşağıdaki kısa notları tek bir kısa nota birleştir. Yeni bilgi ekleme, yorum yapma. Tek cümle, üçüncü şahıs.",
      contents: [{ role: "user", text: notes.map((n) => `- ${n.text}`).join("\n") }],
      maxOutputTokens: 200,
      temperature: 0.1,
    });
    if (!res.ok) continue;
    const source = notes.map((n) => n.text).join(" ");
    const summaryWords = contentWords(res.text).map((w) => w.slice(0, 5));
    const sourceWords = new Set(contentWords(source).map((w) => w.slice(0, 5)));
    if (summaryWords.length === 0 || summaryWords.filter((w) => sourceWords.has(w)).length / summaryWords.length < 0.8) continue;
    await addMemory(db, { category: category as (typeof notes)[number]["category"], text: res.text.trim().slice(0, 200), sourceConversationId: null, confidence: 1 }, fts);
    for (const n of notes) {
      await deleteMemory(db, n.id, fts);
      await db.execute({ sql: `UPDATE memories SET status = 'ozetlendi' WHERE id = ?`, args: [n.id] });
    }
    merged++;
  }
  return merged;
}
