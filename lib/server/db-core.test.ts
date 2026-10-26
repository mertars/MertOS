import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMealLog, deleteMealLog, getDailyBrief, getSettings, listMealLog, setRoutineDone, updateSettings } from "./assistant-repo";
import { createBackup, serializeBackup, BACKUP_KEEP } from "./backup";
import { prepareDatabase } from "./db-core";
import { checkLoginAllowed, IP_MAX_FAILURES, recordLoginAttempt } from "./login-guard";

// Gerçek bir libSQL veritabanı (yerel dosya) üzerinde — Turso ile aynı SQL motoru.
let dir: string;
let db: Client;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "mertos-db-"));
  db = createClient({ url: `file:${join(dir, "test.db")}` });
});
afterAll(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("prepareDatabase", () => {
  it("şemayı kurar, FTS5'i oluşturur, varsayılanları yazar; ikinci çalıştırma idempotent", async () => {
    const first = await prepareDatabase(db);
    expect(first.version).toBe(1);
    expect(first.ftsAvailable).toBe(true);
    const second = await prepareDatabase(db);
    expect(second.version).toBe(1);
    const n = Number((await db.execute("SELECT COUNT(*) AS n FROM schedule_items")).rows[0].n);
    expect(n).toBeGreaterThan(5);
  });
});

describe("ayarlar", () => {
  it("varsayılan hitap 'Mert Bey', güncellenebilir", async () => {
    expect((await getSettings(db)).hitap).toBe("Mert Bey");
    expect((await updateSettings(db, { hitap: "Mert" })).hitap).toBe("Mert");
    await updateSettings(db, { hitap: "Mert Bey" });
  });
});

describe("günlük kayıt + özet", () => {
  it("rutin işaretleme ve öğün kaydı özete yansır; geri al çalışır", async () => {
    const date = "2026-10-26";
    await setRoutineDone(db, date, "kosu", true);
    await setRoutineDone(db, date, "soguk_dus", true);
    await setRoutineDone(db, date, "soguk_dus", false);
    const id = await addMealLog(db, { date, mealType: "ogle", mealId: null, mealName: "Menemen", isLeftover: false });

    let brief = await getDailyBrief(db, date, "14:00");
    expect(brief.dayType).toBe("kosu");
    expect(brief.routine.done).toBe(1);
    expect(brief.meals.find((m) => m.mealType === "ogle")!.logged?.name).toBe("Menemen");
    expect(brief.week.mealLogs.count).toBe(1);

    await deleteMealLog(db, id);
    expect(await listMealLog(db, date, date)).toEqual([]);
    brief = await getDailyBrief(db, date, "14:00");
    expect(brief.meals.find((m) => m.mealType === "ogle")!.logged).toBeNull();
  });
});

describe("giriş bekletme", () => {
  it(`${IP_MAX_FAILURES} yanlış denemeden sonra o IP'yi bekletir, başarılı giriş sayacı sıfırlar`, async () => {
    const now = Date.now();
    for (let i = 0; i < IP_MAX_FAILURES; i++) await recordLoginAttempt(db, "1.1.1.1", false, now + i);
    const blocked = await checkLoginAllowed(db, "1.1.1.1", now + 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect((await checkLoginAllowed(db, "2.2.2.2", now + 10)).allowed).toBe(true);
    // 15 dk sonra açılır
    expect((await checkLoginAllowed(db, "1.1.1.1", now + 16 * 60 * 1000)).allowed).toBe(true);
    await recordLoginAttempt(db, "1.1.1.1", true, now + 20);
    expect((await checkLoginAllowed(db, "1.1.1.1", now + 30)).allowed).toBe(true);
  });
});

describe("yedek", () => {
  it("tabloları JSON'a döker, en fazla son 8 yedeği tutar", async () => {
    const parsed = JSON.parse(await serializeBackup(db));
    expect(parsed.tables.schedule_items.length).toBeGreaterThan(5);
    expect(parsed.tables.login_attempts).toBeUndefined();
    for (let i = 0; i < BACKUP_KEEP + 2; i++) await createBackup(db);
    expect(Number((await db.execute("SELECT COUNT(*) AS n FROM backups")).rows[0].n)).toBe(BACKUP_KEEP);
  });
});
