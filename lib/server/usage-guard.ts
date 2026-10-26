import type { Client } from "@libsql/client";
import { istanbulNow } from "@/lib/assistant/time";
import type { LlmFn } from "./gemini";

// Ücretli Gemini anahtarı için maliyet sigortası: Türkiye gününe göre en
// fazla `limit` model çağrısı. Aşılınca çağrı Google'a HİÇ gitmez, kota
// mesajı döner (sohbet "limitim doldu" der, Bugün ekranı çalışmaya devam eder).
// Sınır: LLM_GUNLUK_SINIR ortam değişkeni (varsayılan 200).

export const DEFAULT_DAILY_LIMIT = 200;

export function dailyLimitFromEnv(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.LLM_GUNLUK_SINIR);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_DAILY_LIMIT;
}

export function withDailyLimit(db: Client, llm: LlmFn, limit: number, now: () => Date = () => new Date()): LlmFn {
  return async (req) => {
    const date = istanbulNow(now()).date;
    const row = (
      await db.execute({
        sql: `INSERT INTO llm_usage (date, calls) VALUES (?, 1) ON CONFLICT(date) DO UPDATE SET calls = calls + 1 RETURNING calls`,
        args: [date],
      })
    ).rows[0];
    if (Number(row.calls) > limit) {
      return { ok: false, reason: "kota", detail: `günlük sınır (${limit}) doldu` };
    }
    return llm(req);
  };
}
