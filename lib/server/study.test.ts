import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/assistant/config";
import { addDays, istanbulNow } from "@/lib/assistant/time";
import { dueSlot } from "@/lib/assistant/proactive";
import { getDailyBrief } from "./assistant-repo";
import { handleChat } from "./chat";
import { prepareDatabase } from "./db-core";
import type { LlmFn, LlmRequest } from "./gemini";
import { handleProactive } from "./proactive";
import { addBlocks, deleteBlock, getStudyOverview, listExams, restoreBlock, setAttendance, setReadiness } from "./study-repo";

// Bölüm 18 — ders ve sınav: veri senkronu, blok kaydı + geri al, sınav sabahı/önceki akşam
// mesajları (koddan, model YOK), modele derslik gitmemesi.

let dir: string;
let db: Client;
const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+03:00`);

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "mertos-ders-"));
  db = createClient({ url: `file:${join(dir, "d.db")}` });
  await prepareDatabase(db);
});
afterAll(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

function recordingLlm(text = "Tamam Mert Bey."): { fn: LlmFn; calls: LlmRequest[] } {
  const calls: LlmRequest[] = [];
  return { calls, fn: async (req) => (calls.push(req), { ok: true, text, model: "sahte" }) };
}

describe("ders/sınav verisi", () => {
  it("koddaki 8 sınav tabloya yazılır, ikinci açılışta tekrar yazılmaz", async () => {
    expect((await listExams(db)).map((e) => `${e.date} ${e.time} ${e.courseId}`)).toEqual([
      "2026-11-03 11:30 BSM3017",
      "2026-11-03 16:00 BSM2037",
      "2026-11-04 12:00 BSM3007",
      "2026-11-04 16:00 BSM2033",
      "2026-11-05 15:00 BSM3003",
      "2026-11-05 16:00 BSM2011",
      "2026-11-06 11:00 BSM2035",
      "2026-11-06 16:00 BSM2031",
    ]);
    await prepareDatabase(db);
    expect(await listExams(db)).toHaveLength(8);
  });

  it("blok kaydı plana sayılır; sil + geri al", async () => {
    const now = { date: "2026-10-27", time: "10:00" };
    const before = await getStudyOverview(db, now, DEFAULT_SETTINGS);
    const b = await addBlocks(db, { date: "2026-10-27", courseId: "BSM2037", blocks: 2 });
    const after = await getStudyOverview(db, now, DEFAULT_SETTINGS);
    expect(after.plan.todayDone).toBe(before.plan.todayDone + 2);
    expect(after.recent[0]).toMatchObject({ courseId: "BSM2037", blocks: 2 });
    await deleteBlock(db, b.id);
    expect((await getStudyOverview(db, now, DEFAULT_SETTINGS)).plan.todayDone).toBe(before.plan.todayDone);
    await restoreBlock(db, b.id);
    expect((await getStudyOverview(db, now, DEFAULT_SETTINGS)).plan.todayDone).toBe(before.plan.todayDone + 2);
  });

  it("5 Kasım çakışması ve sınav haftası", async () => {
    const o = await getStudyOverview(db, { date: "2026-10-27", time: "10:00" }, DEFAULT_SETTINGS);
    expect(o.conflicts).toHaveLength(1);
    expect(o.conflicts[0].message).toContain("Sınav süreleri bilinmiyor — okuldan teyit edin.");
    expect(o.examWeek).toEqual({ from: "2026-11-03", to: "2026-11-06" });
  });
});

describe("asistan — ders/sınav anları (koddan, model yok)", () => {
  it("sınav sabahı saat ve derslik; ilk sınava kadar söylenebilir", async () => {
    const llm = recordingLlm();
    const r = await handleProactive({ db, llm: llm.fn, fts: false, now: at("2026-11-03", "09:40") }, "sinav");
    expect(r.message?.content).toBe(
      "Mert Bey, bugün sınav günü: 11:30 Bilgisayar Ağları — Derslik 11 (Bilgisayar Lab. I) ve 13 (Bilgisayar Lab. III); 16:00 Ayrık Matematik — Derslik 1, 7, 8. Başarılar!",
    );
    expect(llm.calls).toHaveLength(0);
  });

  it("sınavdan önceki akşam ertesi günün sınavı", async () => {
    const llm = recordingLlm();
    const r = await handleProactive({ db, llm: llm.fn, fts: false, now: at("2026-11-04", "21:35") }, "sinav-aksam");
    expect(r.message?.content).toBe("Mert Bey, yarın sınav var: 15:00 Yazılım Mühendisliği — Derslik 11, 13; 16:00 İstatistik ve Olasılık Hesapları — Derslik 1, 7, 8. Erken yatmak iyi gelir.");
    expect(llm.calls).toHaveLength(0);
  });

  it("ders hatırlatması 30 dk önce; derse gittim → söylenmez; sınav haftasında kapalı", async () => {
    const tue = await getDailyBrief(db, "2026-10-27", "12:50");
    expect(dueSlot(tue, "12:50", [])).toBe("ders");
    await setAttendance(db, "2026-10-27", "BSM3003-sal", true);
    expect(dueSlot(await getDailyBrief(db, "2026-10-27", "12:50"), "12:50", [])).toBeNull();
    // 6 Kasım Cuma (sınav haftası) Veri Madenciliği dersi var ama hatırlatılmaz
    const fri = await getDailyBrief(db, "2026-11-06", "09:05");
    expect(fri.study?.classes.map((c) => c.courseId)).toEqual(["BSM3007"]);
    // (o sabah "sinav" anı açık — o söylendikten sonra ders hatırlatması gelmez)
    expect(dueSlot(fri, "09:05", [])).toBe("sinav");
    expect(dueSlot(fri, "09:05", ["sinav"])).toBeNull();
  });

  it("sabah konuşmasında bugünkü ders ve blok hedefi; modele derslik gitmez", async () => {
    await setReadiness(db, "BSM2031", 2, "2026-10-27");
    const llm = recordingLlm("Günaydın Mert Bey, bugün Yazılım Mühendisliği dersi ve çalışma bloklarınız var.");
    await handleProactive({ db, llm: llm.fn, fts: false, now: at("2026-10-28", "06:05") }, "sabah");
    expect(llm.calls[0].system).toMatch(/Çalışma hedefi \d+ blok\./);
    expect(llm.calls[0].system).not.toContain("Derslik");

    const chat = recordingLlm();
    await handleChat({ db, llm: chat.fn, fts: false, now: at("2026-10-28", "10:00") }, { message: "Sınavlarım ne zaman?", mode: "yazi" });
    expect(chat.calls[0].system).toContain("3 Kasım 11:30 Bilgisayar Ağları");
    expect(chat.calls[0].system).not.toContain("Derslik 11");
    expect(chat.calls[0].system).not.toContain("Lab.");
  });
});

describe("sesle çalışma bloğu kaydı", () => {
  // Sohbet yazma zamanı gerçek saati kullandığı için (6 saatlik oturum kuralı) bu blokta "bugün" gerçek bugündür.
  const today = istanbulNow().date;
  const yesterday = addDays(today, -1);
  const ask = async (message: string, conversationId?: string) => handleChat({ db, llm: recordingLlm().fn, fts: false }, { conversationId, message, mode: "ses" });
  const total = async (courseId: string, date = today) => (await getStudyOverview(db, { date: today, time: "21:00" }, DEFAULT_SETTINGS)).recent.filter((b) => b.courseId === courseId && b.date === date).reduce((s, b) => s + b.blocks, 0);

  it("'ayrık matematik 2 blok çalıştım' yazar, geri al siler", async () => {
    const before = await total("BSM2037");
    const r = await ask("ayrık matematik iki blok çalıştım");
    expect(r.marks?.content).toBe("İşaretledim: Ayrık Matematik — 2 blok");
    expect(await total("BSM2037")).toBe(before + 2);
    const u = await ask("geri al", r.conversationId);
    expect(u.undone?.content).toContain("geri alındı");
    expect(await total("BSM2037")).toBe(before);
  });

  it("dün denirse düne; başka gün ya da ders dışı cümle yazılmaz", async () => {
    await ask("dün devre teorisi 3 blok çalıştım");
    expect(await total("BSM2033", yesterday)).toBe(3);
    const other = await ask("geçen salı devre teorisi 3 blok çalıştım");
    expect(other.marks).toBeNull();
    expect(await total("BSM2033", today)).toBe(0);
    expect((await ask("bugün işte çalıştım")).marks).toBeNull();
  });

  it("eksikse tek soru: ders yok → sorar → 'algoritmalar' → yazar", async () => {
    const q = await ask("3 blok çalıştım");
    expect(q.reply.content).toBe("Mert Bey, hangi dersi çalıştınız?");
    const a = await ask("algoritmalar", q.conversationId);
    expect(a.marks?.content).toBe("İşaretledim: Veri Yapıları ve Algoritmalar — 3 blok");
    const q2 = await ask("istatistik çalıştım", a.conversationId);
    expect(q2.reply.content).toBe("Mert Bey, İstatistik ve Olasılık Hesapları için kaç blok yazayım?");
    const a2 = await ask("iki", q2.conversationId);
    expect(a2.marks?.content).toBe("İşaretledim: İstatistik ve Olasılık Hesapları — 2 blok");
  });
});
