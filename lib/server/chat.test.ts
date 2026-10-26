import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_CHORES, DEFAULT_SCHEDULE } from "@/data/assistant/defaults";
import { buildDailyBrief } from "@/lib/assistant/daily";
import { QUOTA_MESSAGE } from "@/lib/assistant/persona";
import { addMealLog, listRoutineLog } from "./assistant-repo";
import { describeToday, extractMemories, handleChat, undoChatAction, summarizeIfNeeded, SUMMARIZE_AFTER } from "./chat";
import { listMessages } from "./chat-repo";
import { listTodos } from "./todo-repo";
import { prepareDatabase } from "./db-core";
import type { LlmFn, LlmRequest } from "./gemini";
import { deleteMemory, listActiveMemories, restoreMemory, searchMemories } from "./memory-repo";

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
    expect(r.marks?.content).toBe("İşaretledim: soğuk duş, koşu");
    expect(r.marks?.meta?.routine).toEqual({ date: "2026-10-26", items: ["soguk_dus", "kosu"] });
    expect(llm.calls[0].system).toContain("Sistem az önce işaretledi: soğuk duş, koşu");
    expect(llm.calls[0].system).toMatch(/Yapılanlar: .*Koşu/);
    // "not" satırı modele geçmiş olarak gitmez
    expect(llm.calls[0].contents.some((c) => c.text.includes("İşaretledim"))).toBe(false);
    const done = (await listRoutineLog(db, "2026-10-26", "2026-10-26")).filter((x) => x.done).map((x) => x.item);
    expect(done).toEqual(expect.arrayContaining(["soguk_dus", "kosu"]));

    // Aynı şey tekrar söylenirse yeni satır yok, model "zaten işaretliydi" bilgisini alır
    const again = fakeLlm(["Tamam."]);
    const r2 = await handleChat({ db, llm: again.fn, fts: true, now: NOW }, { conversationId: r.conversationId, message: "Koştum", mode: "yazi" });
    expect(r2.marks).toBeNull();
    expect(again.calls[0].system).toContain("Zaten işaretliydi: koşu");

    const undone = await undoChatAction(db, r.marks!.id);
    expect(undone?.content).toBe("İşaretleme geri alındı: soğuk duş, koşu");
    expect(undone?.meta).toEqual({ routineUndone: true });
    expect((await listRoutineLog(db, "2026-10-26", "2026-10-26")).filter((x) => x.done).map((x) => x.item)).not.toContain("kosu");
    expect(await undoChatAction(db, r.marks!.id)).toBeNull();
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

describe("sohbetten yapılacaklar listesi", () => {
  const MARKER = "[[YAPILACAK gün=bugün saat=20:00 başlık=20 dk hafif yürüyüş]]";

  it("kabul + saat → listeye eklenir, işaret satırı cevaptan silinir, geri alınabilir", async () => {
    const llm = fakeLlm([`Süper Mert Bey, bugün 20:00'ye listeye ekledim.\n${MARKER}`]);
    const r = await handleChat({ db, llm: llm.fn, fts: true, now: NOW }, { message: "Olur, akşam 8'de yaparım.", mode: "yazi" });
    expect(r.reply.content).toBe("Süper Mert Bey, bugün 20:00'ye listeye ekledim.");
    expect(r.todo?.content).toBe("Listeye ekledim: 20 dk hafif yürüyüş — bugün 20:00");
    const todos = await listTodos(db, "2026-10-26", "2026-10-26");
    expect(todos.map((t) => [t.title, t.time, t.source])).toEqual([["20 dk hafif yürüyüş", "20:00", "sohbet"]]);

    // Aynı şey tekrar önerilirse ikinci kez eklenmez; model listeyi bağlamda görür
    const again = fakeLlm([`Zaten listede.\n${MARKER}`]);
    const r2 = await handleChat({ db, llm: again.fn, fts: true, now: NOW }, { conversationId: r.conversationId, message: "Tamam", mode: "yazi" });
    expect(r2.todo).toBeNull();
    expect(again.calls[0].system).toContain("Yapılacaklar listesi (bugün): 20:00 20 dk hafif yürüyüş (yapılmadı)");

    const undone = await undoChatAction(db, r.todo!.id);
    expect(undone?.content).toBe("Listeden çıkarıldı: 20 dk hafif yürüyüş — bugün 20:00");
    expect(await listTodos(db, "2026-10-26", "2026-10-26")).toEqual([]);
  });

  it("Mert kabul etmediyse model ekleyemez", async () => {
    const llm = fakeLlm([`Listeye ekledim.\n${MARKER}`]);
    const r = await handleChat({ db, llm: llm.fn, fts: true, now: NOW }, { message: "Selam", mode: "yazi" });
    expect(r.todo).toBeNull();
    expect(r.reply.content).not.toContain("YAPILACAK");
    expect(await listTodos(db, "2026-10-26", "2026-10-26")).toEqual([]);
  });

  it("'yürüyüşü yaptım' listedeki maddeyi kapatır (koşu gününde programda yok uyarısı vermeden)", async () => {
    const add = fakeLlm([`Ekledim.\n${MARKER}`]);
    await handleChat({ db, llm: add.fn, fts: true, now: NOW }, { message: "Olur, 20:00", mode: "yazi" });
    const llm = fakeLlm(["Helal Mert Bey, işaretledim."]);
    const r = await handleChat({ db, llm: llm.fn, fts: true, now: NOW }, { message: "Akşam yürüyüşünü yaptım", mode: "yazi" });
    expect(r.marks?.content).toBe("İşaretledim: 20 dk hafif yürüyüş");
    expect(llm.calls[0].system).not.toContain("programında yok");
    expect((await listTodos(db, "2026-10-26", "2026-10-26"))[0].done).toBe(true);
    await undoChatAction(db, r.marks!.id);
    expect((await listTodos(db, "2026-10-26", "2026-10-26"))[0].done).toBe(false);
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

describe("Hafızam: sil → geri al", () => {
  it("silinen not geri gelir ve yeniden aranabilir; aktif not 'geri alınamaz'", async () => {
    const before = await listActiveMemories(db);
    const note = before.find((m) => m.text.toLocaleLowerCase("tr-TR").includes("ıspanak")) ?? before[0];
    expect(note).toBeDefined();
    await deleteMemory(db, note.id, true);
    expect((await listActiveMemories(db)).some((m) => m.id === note.id)).toBe(false);
    expect(await restoreMemory(db, note.id, true)).toBe(true);
    expect((await listActiveMemories(db)).some((m) => m.id === note.id)).toBe(true);
    expect((await searchMemories(db, note.text, true)).some((m) => m.id === note.id)).toBe(true);
    expect(await restoreMemory(db, note.id, true)).toBe(false);
  });
});
