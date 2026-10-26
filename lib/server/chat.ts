import type { Client } from "@libsql/client";
import type { AssistantSettings } from "@/lib/assistant/config";
import type { DailyBrief } from "@/lib/assistant/daily";
import { DAY_TYPE_LABELS, dayTypeFor, ROUTINE_LABELS } from "@/lib/assistant/daily";
import { parseDayReferences } from "@/lib/assistant/day-ref";
import { buildExtractionPrompt, EXTRACTION_RESPONSE_SCHEMA, extractionSchema, filterExtractedNotes, MEMORY_CATEGORY_LABELS } from "@/lib/assistant/memory-extract";
import { MEAL_TYPE_LABELS } from "@/lib/assistant/meals";
import { checkOutput } from "@/lib/assistant/output-check";
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
import type { MealLogRow, RoutineLogRow } from "@/lib/assistant/types";
import { getDailyBrief, getSettings, listMealLog, listMeals, listRoutineLog } from "./assistant-repo";
import {
  addMessage,
  createConversation,
  getConversation,
  listIdleUnextracted,
  listMessages,
  markMemoryExtracted,
  setSummary,
  type ChatMessage,
  type Conversation,
} from "./chat-repo";
import type { LlmFn, LlmRequest } from "./gemini";
import { addMemory, deleteMemory, listActiveMemories, searchMemories } from "./memory-repo";

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

export function describeToday(brief: DailyBrief): string {
  const done = brief.schedule.filter((s) => s.done).map((s) => s.title);
  const pending = brief.schedule.filter((s) => s.done === false && s.time <= brief.time).map((s) => `${s.time} ${s.title}`);
  const meals = brief.meals
    .map((m) => {
      if (m.logged) return `${m.label}: yendi — ${m.logged.name}${m.logged.isLeftover ? " (kalan)" : ""}`;
      const s = m.suggestion;
      if (s.kind === "kalan") return `${m.label}: öneri — kalan ${s.meal.name} (${s.remaining} porsiyon${s.meal.reheat ? `, ${s.meal.reheat}` : ""})`;
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
    `Bu hafta: koşu ${w.runs.done}/${w.runs.planned}, yürüyüş ${w.walks.done}/${w.walks.planned}, rutin %${w.routinePct}, öğün kaydı ${w.mealLogs.count}.`,
    `Projeler: GitHub bağlantısı henüz yok — proje durumu bilinmiyor.`,
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
// Ana akış

export interface ChatResult {
  conversationId: string;
  userMessage: ChatMessage;
  reply: ChatMessage;
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

  const userMessage = await addMessage(db, { conversationId: conversation.id, role: "user", content: input.message, mode: input.mode });

  const settings = await getSettings(db);
  const models = modelsFrom(settings);
  const [brief, facts, memories, allMessages, meals] = await Promise.all([
    getDailyBrief(db, now.date, now.time),
    buildFacts(db, input.message, now.date),
    searchMemories(db, input.message, fts),
    listMessages(db, conversation.id),
    listMeals(db),
  ]);

  const today = describeToday(brief);
  const system = buildSystemPrompt({
    hitap: settings.hitap,
    tone: pickTone(now.time, input.message),
    mode: input.mode,
    today,
    facts: facts.text,
    memories: memories.map((m) => `[${MEMORY_CATEGORY_LABELS[m.category]}] ${m.text}`),
    summary: conversation.summary,
  });
  const contents = toContents(allMessages.slice(-RAW_HISTORY));
  const contextText = `${today}\n${facts.text}\n${memories.map((m) => m.text).join("\n")}\n${conversation.summary ?? ""}\n${allMessages.map((m) => m.content).join("\n")}`;
  const knownMealNames = [...new Set([...meals.map((m) => m.name), ...facts.mealNames])];

  const request: LlmRequest = { models: models.chat, system, contents, maxOutputTokens: MAX_OUTPUT_TOKENS[input.mode] };
  const result = await llm(request);
  let regenerated = false;
  let problems: string[] = [];
  let text: string;

  if (!result.ok) {
    text = result.reason === "kota" ? QUOTA_MESSAGE : result.reason === "yapilandirma" ? NOT_CONFIGURED_MESSAGE : LLM_DOWN_MESSAGE;
  } else {
    let checked = checkOutput({ text: result.text, mode: input.mode, hitap: settings.hitap, context: contextText, knownMealNames });
    if (checked.problems.length) {
      regenerated = true;
      const retry = await llm({ ...request, system: `${system}\n\n# DÜZELT (önceki cevabında sorun vardı)\n${checked.problems.join("\n")}` });
      if (retry.ok) checked = checkOutput({ text: retry.text, mode: input.mode, hitap: settings.hitap, context: contextText, knownMealNames });
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
  return { conversationId: conversation.id, userMessage, reply, regenerated, problems, failure: result.ok ? undefined : result.reason };
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
