// Oturum çerezi — imzalı, sunucuda durum tutmayan bir jeton.
// Biçim: v1.<bitişZamanı(sn)>.<HMAC-SHA256 imza, base64url>
// İmza anahtarı = SESSION_SECRET + şifre hash'i → şifre değişince tüm eski
// oturumlar kendiliğinden geçersiz olur. Web Crypto kullanır; hem proxy.ts
// hem API route'ları tarafından kullanılabilir.

export const SESSION_COOKIE = "mertos_oturum";
export const SESSION_DAYS = 180;
/** Kalan süre bunun altına düşünce proxy çerezi yeniler (kayan oturum). */
export const SESSION_REFRESH_DAYS = 90;

export interface AuthConfig {
  passwordHash: string;
  secret: string;
}

/**
 * Ortam değişkenlerinden giriş ayarlarını okur. APP_PASSWORD_HASH, `$`
 * karakterlerinin .env dosyalarında bozulmaması için base64 olarak saklanır
 * (doğrudan "$2a$…" biçimi de kabul edilir).
 */
export function getAuthConfig(env: Record<string, string | undefined> = process.env): AuthConfig | null {
  const rawHash = env.APP_PASSWORD_HASH?.trim();
  const secret = env.SESSION_SECRET?.trim();
  if (!rawHash || !secret || secret.length < 32) return null;
  const passwordHash = rawHash.startsWith("$2") ? rawHash : decodeBase64(rawHash);
  if (!passwordHash.startsWith("$2")) return null;
  return { passwordHash, secret };
}

function decodeBase64(value: string): string {
  try {
    return atob(value);
  } catch {
    return "";
  }
}

function toBase64Url(bytes: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string, config: AuthConfig): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${config.secret}|${config.passwordHash}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(config: AuthConfig, nowMs = Date.now()): Promise<{ token: string; expiresAt: Date }> {
  const exp = Math.floor(nowMs / 1000) + SESSION_DAYS * 86_400;
  const payload = `v1.${exp}`;
  return { token: `${payload}.${await sign(payload, config)}`, expiresAt: new Date(exp * 1000) };
}

/** Geçerliyse bitiş zamanını (sn) döner, değilse null. */
export async function verifySessionToken(token: string | undefined, config: AuthConfig, nowMs = Date.now()): Promise<number | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp * 1000 <= nowMs) return null;
  const expected = await sign(`${parts[0]}.${parts[1]}`, config);
  return timingSafeEqual(expected, parts[2]) ? exp : null;
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}
