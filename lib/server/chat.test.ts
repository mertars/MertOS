import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_CHORES, DEFAULT_SCHEDULE } from "@/data/assistant/defaults";
import { buildDailyBrief } from "@/lib/assistant/daily";
import { QUOTA_MESSAGE } from "@/lib/assistant/persona";
import { addMealLog, listRoutineLog } from "./assistant-repo";
import { describeToday, extractMemories, handleChat, undoRoutineMark, summarizeIfNeeded, SUMMARIZE_AFTER } from "./chat";
import { listMessages } from "./chat-repo";
import { prepareDatabase } from "./db-core";
import type { LlmFn, LlmRequest } from "./gemini";
import { listActiveMemories, searchMemories } from "./memory-repo";

// SAHTE LLM ile KOD YOLU testleri — cevap kalitesi burada ölçülmez
// (o, gerçek Gemini ile scenarios/ altındaki senaryo setinin işi).

let dir: string;
let db: Client;
// 2026-10-26 Pazartesi 12:00 TR
const NOW = new Date("2026-10-26T09:00:00Z");

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "mertos-chat-"));
  db = createClient({ url: `file:${join(dir, "chat.db")}` });
  await prepareDatabase(db);
  await addMealLog(db, { date: "2026-10-24", mealType: "ogle", mealId: null, mealName: "Mercimek çorbası", isLeftover: false, rating: 4 });
});
afterAll(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

function fakeLlm(replies: string[]): { fn: LlmFn; calls: LlmRequest[] } {
  const calls: LlmRequest[] = [];
  return {
    calls,
    fn: async (req) => {
      calls.push(req);
      return { ok: true, text: replies[Math.min(calls.length - 1, replies.length - 1)], model: "sahte" };
    },
  };
}

describe("describeToday", () => {
  it("kalan yemeğin pişirildiği günü yazar (model 'dünden kalan' diye tahmin etmesin)", () => {
    const brief = buildDailyBrief({
      date: "2026-10-26",
      time: "12:00",
      hitap: "Mert Bey",
      schedule: DEFAULT_SCHEDULE,
      chores: DEFAULT_CHORES,
      routineLog: [],
      meals: [{ id: "mercimek", name: "Mercimek çorbası", mealTypes: ["ogle", "aksam"], durationMin: 35, difficulty: "kolay", equipment: ["ocak"], steps: [], ingredients: [], servings: 3, reheat: "ocak", dayTypes: [], tags: [] }],
      mealLog: [{ id: 1, date: "2026-10-24", mealType: "ogle", mealId: "mercimek", mealName: "Mercimek çorbası", isLeftover: false, rating: null, note: null, repeat: false, createdAt: "" }],
    });
    expect(describeToday(brief)).toContain("kalan Mercimek çorbası (pişirme: 24 Ekim, 2 porsiyon, ocak)");
  });
});

describe("handleChat", () => {
  it("sorulan günün kaydını bağlama koddan koyar, hitap ve tarih bağlamda", async () => {
    const llm = fakeLlm(["Mert Bey, 24 Ekim öğlen mercimek çorbası yemişsiniz."]);
    const r = await handleChat({ db, llm: llm.fn, fts: true, now: NOW }, { message: "2 gün önce ne yemiştim?", mode: "yazi" });
    const system = llm.calls[0].system;
    expect(system).toContain("Sorulan gün → 24 Ekim Cumartesi (2026-10-24");
    expect(system).toContain("Mercimek çorbası (puan 4/5)");
    expect(system).toContain('"Mert Bey"');
    expect(r.regenerated).toBe(false);
    expect(r.reply.content).toContain("mercimek");
    expect(llm.calls[0].contents.at(-1)).toEqual({ role: "user", text: "2 gün önce ne yemiştim?" });
  });

  it("yanlış hitap/uydurma tarihte en fazla 1 kez yeniden üretir", async () => {
    const llm = fakeLlm(["Mert, 3 Mart'ta koştun.", "Mert Bey, bunu kaydımda bulamadım."]);
    const r = await handleChat({ db, llm: llm.fn, fts: true, now: NOW }, { message: "Mart'ta koştum mu?", mode: "yazi" });
    expect(llm.calls.length).toBe(2);
    expect(llm.calls[1].system).toContain("# DÜZELT");
    expect(r.regenerated).toBe(true);
    expect(r.problems).toEqual([]);
    expect(r.reply.content).toBe("Mert Bey, bunu kaydımda bulamadım.");

    const stubborn = fakeLlm(["Mert, 3 Mart."]);
    await handleChat({ db, llm: stubborn.fn, fts: true, now: NOW }, { message: "selam", mode: "yazi" });
    expect(stubborn.calls.length).toBe(2); // 3. kez denenmez
  });

  it("kota dolunca sabit mesaj döner, uygulama bozulmaz", async () => {
    const llm: LlmFn = async () => ({ ok: false, reason: "kota", detail: "429" });
    const r = await handleChat({ db, llm, fts: true, now: NOW }, { message: "selam", mode: "yazi" });
    expect(r.reply.content).toBe(QUOTA_MESSAGE);
    expect(r.failure).toBe("kota");
    expect(r.reply.meta?.system).toBe(true);
  });

  it("ses modunda cevabı 3 cümleye kırpar", async () => {
    const llm = fakeLlm(["Bir. İki. Üç. Dört."]);
    const r = await handleChat({ db, llm: llm.fn, fts: true, now: NOW }, { message: "selam", mode: "ses" });
    expect(r.reply.content).toBe("Bir. İki. Üç.");
  });
});

describe("sohbetten rutin işaretleme", () => {
  it("'koştum, duş da aldım' modelden önce işaretlenir, satırı geri alınabilir", async () => {
    const llm = fakeLlm(["Süper Mert Bey, ikisini de işaretledim."]);
    const r = await handleChat({ db, llm: llm.fn, fts: true, now: NOW }, { message: "Koştum, duş da aldım.", mode: "yazi" });
    expect(r.marks?.content).toBe("İşaretledim: Soğuk duş, Koşu");
    expect(r.marks?.meta?.routine).toEqual({ date: "2026-10-26", items: ["soguk_dus", "kosu"] });
    expect(llm.calls[0].system).toContain("Sistem az önce işaretledi: Soğuk duş, Koşu");
    expect(llm.calls[0].system).toMatch(/Yapılanlar: .*Koşu/);
    // "not" satırı modele geçmiş olarak gitmez
    expect(llm.calls[0].contents.some((c) => c.text.includes("İşaretledim"))).toBe(false);
    const done = (await listRoutineLog(db, "2026-10-26", "2026-10-26")).filter((x) => x.done).map((x) => x.item);
    expect(done).toEqual(expect.arrayContaining(["soguk_dus", "kosu"]));

    // Aynı şey tekrar söylenirse yeni satır yok, model "zaten işaretliydi" bilgisini alır
    const again = fakeLlm(["Tamam."]);
    const r2 = await handleChat({ db, llm: again.fn, fts: true, now: NOW }, { conversationId: r.conversationId, message: "Koştum", mode: "yazi" });
    expect(r2.marks).toBeNull();
    expect(again.calls[0].system).toContain("Zaten işaretliydi: Koşu");

    const undone = await undoRoutineMark(db, r.marks!.id);
    expect(undone?.content).toBe("İşaretleme geri alındı: Soğuk duş, Koşu");
    expect(undone?.meta).toEqual({ routineUndone: true });
    expect((await listRoutineLog(db, "2026-10-26", "2026-10-26")).filter((x) => x.done).map((x) => x.item)).not.toContain("kosu");
    expect(await undoRoutineMark(db, r.marks!.id)).toBeNull();
  });

  it("asistanın sorusuna 'evet' cevabı sorulan maddeyi işaretler", async () => {
    const first = fakeLlm(["Mert Bey, bugün koşuyu yaptınız mı?"]);
    const r = await handleChat({ db, llm: first.fn, fts: true, now: NOW }, { message: "Selam", mode: "yazi" });
    expect(r.marks).toBeNull();
    const second = fakeLlm(["İşaretledim, Mert Bey."]);
    const r2 = await handleChat({ db, llm: second.fn, fts: true, now: NOW }, { conversationId: r.conversationId, message: "Evet", mode: "yazi" });
    expect(r2.marks?.meta?.routine?.items).toEqual(["kosu"]);
  });

  it("programda olmayan madde işaretlenmez, model bilgilendirilir", async () => {
    const llm = fakeLlm(["Bugün koşu günü, Mert Bey."]);
    const r = await handleChat({ db, llm: llm.fn, fts: true, now: NOW }, { message: "Yürüdüm", mode: "yazi" });
    expect(r.marks).toBeNull();
    expect(llm.calls[0].system).toContain("Yürüyüş o günün programında yok");
  });
});

describe("hafıza çıkarma", () => {
  it("Mert'in söylediğini not alır, 'Not aldım' satırı ekler, FTS ile bulunur", async () => {
    const chat = fakeLlm(["Not ettim Mert Bey."]);
    const r = await handleChat({ db, llm: chat.fn, fts: true, now: NOW }, { message: "Bu arada ben ıspanağı hiç sevmem, laktozsuz süt içerim.", mode: "yazi" });
    const extractor = fakeLlm([
      JSON.stringify({
        notlar: [
          { kategori: "yemek_tercihi", metin: "Ispanağı sevmiyor.", guven: 0.95 },
          { kategori: "yemek_tercihi", metin: "Brokoliyi sevmiyor.", guven: 0.95 },
        ],
      }),
    ]);
    const notes = await extractMemories({ db, llm: extractor.fn, fts: true }, r.conversationId);
    expect(notes.map((n) => n.text)).toEqual(["Ispanağı sevmiyor."]);
    expect(extractor.calls[0].responseSchema).toBeDefined();
    const msgs = await listMessages(db, r.conversationId);
    expect(msgs.at(-1)!.role).toBe("not");
    expect(msgs.at(-1)!.content).toBe("Not aldım: Ispanağı sevmiyor.");

    const found = await searchMemories(db, "ıspanaklı bir şey yapsam mı", true);
    expect(found.map((m) => m.text)).toEqual(["Ispanağı sevmiyor."]);

    // İkinci çalıştırma: yeni mesaj yok → model çağrılmaz
    const again = fakeLlm(["{}"]);
    expect(await extractMemories({ db, llm: again.fn, fts: true }, r.conversationId)).toEqual([]);
    expect(again.calls.length).toBe(0);
    expect((await listActiveMemories(db)).length).toBe(1);
  });
});

describe("sohbet özeti", () => {
  it(`${SUMMARIZE_AFTER}'dan fazla mesajda eskileri hafif modelle özetler`, async () => {
    const chat = fakeLlm(["Tamam Mert Bey."]);
    let id: string | null = null;
    for (let i = 0; i < 9; i++) {
      const r = await handleChat({ db, llm: chat.fn, fts: true, now: NOW }, { conversationId: id, message: `mesaj ${i}`, mode: "yazi" });
      id = r.conversationId;
    }
    const summarizer = fakeLlm(["Mert 9 kısa mesaj attı."]);
    expect(await summarizeIfNeeded({ db, llm: summarizer.fn, fts: true }, id!)).toBe(true);
    const next = fakeLlm(["Tamam Mert Bey."]);
    await handleChat({ db, llm: next.fn, fts: true, now: NOW }, { conversationId: id, message: "son", mode: "yazi" });
    expect(next.calls[0].system).toContain("Mert 9 kısa mesaj attı.");
    expect(next.calls[0].contents.length).toBeLessThanOrEqual(8);
  });
});
