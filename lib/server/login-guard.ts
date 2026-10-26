import type { Client } from "@libsql/client";

// Yanlış şifre denemelerine bekletme (rate limit). Veritabanında tutulur ki
// Vercel'in birden fazla sunucu örneği arasında da geçerli olsun.

export const IP_WINDOW_MS = 15 * 60 * 1000;
export const IP_MAX_FAILURES = 5;
/** IP değiştirerek deneme yapılmasına karşı tüm IP'ler için toplam üst sınır. */
export const GLOBAL_WINDOW_MS = 60 * 60 * 1000;
export const GLOBAL_MAX_FAILURES = 30;

export interface GuardResult {
  allowed: boolean;
  /** Bekleme gerekiyorsa kaç saniye */
  retryAfterSec: number;
}

export async function checkLoginAllowed(db: Client, ip: string, nowMs = Date.now()): Promise<GuardResult> {
  const ipRows = (
    await db.execute({
      sql: `SELECT at FROM login_attempts WHERE ip = ? AND ok = 0 AND at > ? ORDER BY at`,
      args: [ip, nowMs - IP_WINDOW_MS],
    })
  ).rows.map((r) => Number(r.at));
  if (ipRows.length >= IP_MAX_FAILURES) {
    const oldestRelevant = ipRows[ipRows.length - IP_MAX_FAILURES];
    return { allowed: false, retryAfterSec: Math.ceil((oldestRelevant + IP_WINDOW_MS - nowMs) / 1000) };
  }

  const globalRows = (
    await db.execute({ sql: `SELECT at FROM login_attempts WHERE ok = 0 AND at > ? ORDER BY at`, args: [nowMs - GLOBAL_WINDOW_MS] })
  ).rows.map((r) => Number(r.at));
  if (globalRows.length >= GLOBAL_MAX_FAILURES) {
    const oldestRelevant = globalRows[globalRows.length - GLOBAL_MAX_FAILURES];
    return { allowed: false, retryAfterSec: Math.ceil((oldestRelevant + GLOBAL_WINDOW_MS - nowMs) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export async function recordLoginAttempt(db: Client, ip: string, ok: boolean, nowMs = Date.now()) {
  await db.batch(
    [
      { sql: `INSERT INTO login_attempts (ip, at, ok) VALUES (?, ?, ?)`, args: [ip, nowMs, ok ? 1 : 0] },
      // Başarılı girişte o IP'nin hata sayacı sıfırlanır; 1 günden eski kayıtlar temizlenir.
      ...(ok ? [{ sql: `DELETE FROM login_attempts WHERE ip = ? AND ok = 0`, args: [ip] }] : []),
      { sql: `DELETE FROM login_attempts WHERE at < ?`, args: [nowMs - 86_400_000] },
    ],
    "write",
  );
}
