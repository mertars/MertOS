import { describe, expect, it } from "vitest";
import { createSessionToken, getAuthConfig, SESSION_DAYS, verifySessionToken } from "./session";

const HASH = "$2a$12$abcdefghijklmnopqrstuuJ8v4o2mQ8m1sC0yqkYlq1jzq9b8F3e6";
const config = { passwordHash: HASH, secret: "x".repeat(40) };

describe("getAuthConfig", () => {
  it("base64 hash'i çözer, doğrudan $2 biçimini de kabul eder", () => {
    expect(getAuthConfig({ APP_PASSWORD_HASH: btoa(HASH), SESSION_SECRET: "s".repeat(40) })?.passwordHash).toBe(HASH);
    expect(getAuthConfig({ APP_PASSWORD_HASH: HASH, SESSION_SECRET: "s".repeat(40) })?.passwordHash).toBe(HASH);
  });
  it("eksik ya da kısa sır varsa null", () => {
    expect(getAuthConfig({ APP_PASSWORD_HASH: HASH })).toBeNull();
    expect(getAuthConfig({ APP_PASSWORD_HASH: HASH, SESSION_SECRET: "kisa" })).toBeNull();
    expect(getAuthConfig({ APP_PASSWORD_HASH: "bozuk", SESSION_SECRET: "s".repeat(40) })).toBeNull();
  });
});

describe("oturum jetonu", () => {
  it("kendi ürettiği jetonu doğrular", async () => {
    const now = Date.UTC(2026, 9, 26);
    const { token } = await createSessionToken(config, now);
    expect(await verifySessionToken(token, config, now)).toBe(Math.floor(now / 1000) + SESSION_DAYS * 86_400);
  });
  it("süresi geçmiş, kurcalanmış ya da başka anahtarla imzalanmış jetonu reddeder", async () => {
    const now = Date.UTC(2026, 9, 26);
    const { token } = await createSessionToken(config, now);
    expect(await verifySessionToken(token, config, now + (SESSION_DAYS + 1) * 86_400_000)).toBeNull();
    const [v, exp, sig] = token.split(".");
    expect(await verifySessionToken(`${v}.${Number(exp) + 1000}.${sig}`, config, now)).toBeNull();
    expect(await verifySessionToken(token, { ...config, secret: "y".repeat(40) }, now)).toBeNull();
    // Şifre değişince eski oturumlar geçersiz
    expect(await verifySessionToken(token, { ...config, passwordHash: HASH.replace("abc", "xyz") }, now)).toBeNull();
    expect(await verifySessionToken(undefined, config, now)).toBeNull();
    expect(await verifySessionToken("rastgele", config, now)).toBeNull();
  });
});
