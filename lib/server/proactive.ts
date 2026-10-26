import type { Client } from "@libsql/client";
import { checkOutput } from "@/lib/assistant/output-check";
import { buildProactivePrompt, MAX_OUTPUT_TOKENS } from "@/lib/assistant/persona";
import { buildProactiveFacts, CODE_ONLY_SLOTS, dueSlot, fallbackProactiveText, slotTone, type ProactiveSlot } from "@/lib/assistant/proactive";
import { addDays, istanbulNow } from "@/lib/assistant/time";
import { getDailyBrief, getSettings, listMealLog, listMeals } from "./assistant-repo";
import { addMessage, createConversation, getConversation, latestConversation, type ChatMessage } from "./chat-repo";
import { modelsFrom, NEW_CONVERSATION_HOURS, type ChatDeps } from "./chat";

// Planlı konuşma (Faz 4 § 2): istemci "şu an X anı geldi" der; sunucu bunu
// KENDİ saatine ve verisine göre doğrular (saat gelmiş mi, iş zaten yapılmış mı,
// bugün söylendi mi), cümleyi modelle kurar — model ulaşılamazsa ya da cevap
// kontrolden geçmezse koddan hazır cümle — ve sohbete asistan mesajı olarak yazar.

export type ProactiveResult =
  | { message: ChatMessage; via: "model" | "kod" }
  | { message: null; reason: "zamani-degil" | "zaten-soylendi" };

/** Bugün bu an için satırı ilk yazan konuşur (birden çok cihaz/sekme). */
async function claimSlot(db: Client, date: string, slot: ProactiveSlot): Promise<boolean> {
  const res = await db.execute({
    sql: `INSERT OR IGNORE INTO proactive_log (date, slot, created_at) VALUES (?, ?, ?)`,
    args: [date, slot, new Date().toISOString()],
  });
  return res.rowsAffected > 0;
}

export async function spokenSlots(db: Client, date: string): Promise<string[]> {
  return (await db.execute({ sql: `SELECT slot FROM proactive_log WHERE date = ?`, args: [date] })).rows.map((r) => String(r.slot));
}

export async function handleProactive(deps: ChatDeps, slot: ProactiveSlot, conversationId?: string | null): Promise<ProactiveResult> {
  const { db, llm } = deps;
  const nowDate = deps.now ?? new Date();
  const now = istanbulNow(nowDate);

  const brief = await getDailyBrief(db, now.date, now.time);
  const spoken = await spokenSlots(db, now.date);
  if (dueSlot(brief, now.time, spoken.filter((s) => s !== slot)) !== slot) return { message: null, reason: "zamani-degil" };
  if (!(await claimSlot(db, now.date, slot))) return { message: null, reason: "zaten-soylendi" };

  const [settings, mealLog, meals] = await Promise.all([getSettings(db), listMealLog(db, addDays(now.date, -60), now.date), listMeals(db)]);
  const facts = buildProactiveFacts(slot, brief, mealLog);
  // Ders/sınav anları tamamen koddan: saat ve derslik modelden geçmez (Bölüm 18 gizlilik).
  const res: Awaited<ReturnType<typeof llm>> = CODE_ONLY_SLOTS.includes(slot)
    ? { ok: false, reason: "hata", detail: "kod" }
    : await llm({
        models: modelsFrom(settings).chat,
        system: buildProactivePrompt({ hitap: settings.hitap, tone: slotTone(slot), facts }),
        contents: [{ role: "user", text: "(Program saati geldi — şimdi kendiliğinden, kısaca konuş.)" }],
        // Ses cevabından biraz geniş: düşünme token'ları da bu sınırdan yiyor (gemini.ts) ve yarım cümle istemiyoruz.
        maxOutputTokens: MAX_OUTPUT_TOKENS.ses + 200,
      });

  let text = fallbackProactiveText(slot, brief);
  let via: "model" | "kod" = "kod";
  if (res.ok) {
    // Model geçmiş uydurursa (tarih, kayıtsız yemek) ya da hitabı karıştırırsa yeniden denemek yerine koddan cümle.
    const checked = checkOutput({ text: res.text, truncated: res.truncated, mode: "ses", hitap: settings.hitap, context: facts, knownMealNames: meals.map((m) => m.name) });
    // Kesik cevap ("Öğle vakti geldi Kaptan, acıktın mı…") söylenmez — koddan cümle.
    if (!checked.problems.length && checked.text.trim() && !res.truncated && !checked.text.endsWith("…")) {
      text = checked.text;
      via = "model";
    }
  }

  // Açık sohbet varsa ona (Mert cevap verince bağlam olsun), yoksa yeni sohbet.
  let conversation = conversationId ? await getConversation(db, conversationId) : await latestConversation(db);
  if (conversation && nowDate.getTime() - Date.parse(conversation.updatedAt) > NEW_CONVERSATION_HOURS * 3_600_000) conversation = null;
  conversation ??= await createConversation(db);

  const message = await addMessage(db, { conversationId: conversation.id, role: "assistant", content: text, mode: "ses", meta: { proactive: slot } });
  await db.execute({ sql: `UPDATE proactive_log SET message_id = ? WHERE date = ? AND slot = ?`, args: [message.id, now.date, slot] });
  return { message, via };
}
