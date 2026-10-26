import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepareDatabase } from "./db-core";
import type { LlmFn } from "./gemini";
import { dailyLimitFromEnv, withDailyLimit } from "./usage-guard";

let dir: string;
let db: Client;
beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "mertos-usage-"));
  db = createClient({ url: `file:${join(dir, "u.db")}` });
  await prepareDatabase(db);
});
afterAll(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("günlük çağrı sınırı", () => {
  it("sınır aşılınca model hiç çağrılmaz, kota döner; ertesi gün sıfırlanır", async () => {
    let real = 0;
    const llm: LlmFn = async () => {
      real++;
      return { ok: true, text: "x", model: "m" };
    };
    let now = new Date("2026-10-26T10:00:00Z");
    const limited = withDailyLimit(db, llm, 3, () => now);
    const req = { models: ["m"], system: "", contents: [], maxOutputTokens: 10 };
    for (let i = 0; i < 3; i++) expect((await limited(req)).ok).toBe(true);
    const fourth = await limited(req);
    expect(fourth.ok).toBe(false);
    expect(!fourth.ok && fourth.reason).toBe("kota");
    expect(real).toBe(3);
    now = new Date("2026-10-27T10:00:00Z");
    expect((await limited(req)).ok).toBe(true);
    expect(real).toBe(4);
  });
  it("ortam değişkeni okunur, geçersizse varsayılan", () => {
    expect(dailyLimitFromEnv({ LLM_GUNLUK_SINIR: "50" })).toBe(50);
    expect(dailyLimitFromEnv({ LLM_GUNLUK_SINIR: "abc" })).toBe(200);
    expect(dailyLimitFromEnv({})).toBe(200);
  });
});
