import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMealLog } from "./assistant-repo";
import { listMessages } from "./chat-repo";
import { prepareDatabase } from "./db-core";
import type { LlmFn, LlmRequest } from "./gemini";
import { handleProactive } from "./proactive";

// Planlı konuşmanın KOD YOLU (sahte LLM): doğrulama, tek seferlik söyleme, yedek cümle.

let dir: string;
let db: Client;
// 2026-10-26 Pazartesi, TR saatleri
const at = (hhmm: string) => new Date(`2026-10-26T${hhmm}:00+03:00`);

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "mertos-proaktif-"));
  db = createClient({ url: `file:${join(dir, "p.db")}` });
  await prepareDatabase(db);
});
afterAll(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

function llmReturning(result: Awaited<ReturnType<LlmFn>>): { fn: LlmFn; calls: LlmRequest[] } {
  const calls: LlmRequest[] = [];
  return { calls, fn: async (req) => (calls.push(req), result) };
}

describe("handleProactive", () => {
  it("saati gelmemiş anı reddeder, modele gitmez", async () => {
    const llm = llmReturning({ ok: true, text: "x", model: "sahte" });
    const r = await handleProactive({ db, llm: llm.fn, fts: false, now: at("12:00") }, "ogle");
    expect(r).toEqual({ message: null, reason: "zamani-degil" });
    expect(llm.calls).toHaveLength(0);
  });

  it("saat gelince modelin cümlesini sohbete asistan mesajı olarak yazar; ikinci istek söylenmez", async () => {
    const llm = llmReturning({ ok: true, text: "Mert Bey, öğle vakti. Ne yemek istersiniz?", model: "sahte" });
    const r = await handleProactive({ db, llm: llm.fn, fts: false, now: at("13:05") }, "ogle");
    expect(r.message?.content).toBe("Mert Bey, öğle vakti. Ne yemek istersiniz?");
    expect(r.message?.meta).toEqual({ proactive: "ogle" });
    expect("via" in r && r.via).toBe("model");
    expect(llm.calls[0].system).toContain("KENDİLİĞİNDEN KONUŞMA");
    expect(llm.calls[0].system).toContain("SAMİMİ ARKADAŞ");
    expect(await listMessages(db, r.message!.conversationId)).toHaveLength(1);

    const again = await handleProactive({ db, llm: llm.fn, fts: false, now: at("13:10") }, "ogle");
    expect(again).toEqual({ message: null, reason: "zaten-soylendi" });
  });

  it("model ulaşılamazsa (kota) koddan cümle; koç tonu sporda", async () => {
    const llm = llmReturning({ ok: false, reason: "kota", detail: "sınır" });
    const r = await handleProactive({ db, llm: llm.fn, fts: false, now: at("06:35") }, "spor");
    expect(r.message?.content).toBe("Mert Bey, koşu vakti: 6,5 km Zone 2 hafif tempo koşu (nabız üst sınırı 155–160).");
    expect("via" in r && r.via).toBe("kod");
    expect(llm.calls[0].system).toContain("DİSİPLİNLİ KOÇ");
  });

  it("model kayıtta olmayan tarih uydurursa koddan cümle", async () => {
    const llm = llmReturning({ ok: true, text: "Mert Bey, 12 Ekim'de de böyle temizlik yapmıştınız, hadi bakalım.", model: "sahte" });
    const r = await handleProactive({ db, llm: llm.fn, fts: false, now: at("20:31") }, "temizlik");
    expect(r.message?.content).toBe("Mert Bey, temizlik vakti: bulaşık, çamaşır.");
  });

  it("iş zaten yapıldıysa konuşmaz: akşam yemeği kaydedilmiş", async () => {
    await addMealLog(db, { date: "2026-10-26", mealType: "aksam", mealId: null, mealName: "Omlet", isLeftover: false }, "ekran");
    const llm = llmReturning({ ok: true, text: "x", model: "sahte" });
    const r = await handleProactive({ db, llm: llm.fn, fts: false, now: at("19:35") }, "aksam");
    expect(r).toEqual({ message: null, reason: "zamani-degil" });
    expect(llm.calls).toHaveLength(0);
  });
});
