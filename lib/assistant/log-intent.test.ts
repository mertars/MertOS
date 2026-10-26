import { describe, expect, it } from "vitest";
import { detectMealLog, isBareDone, isUndoCommand, parseRating, questionParticle, resolvePending, type MealContext } from "./log-intent";

// 2026-10-26 Pazartesi
const ctx = (over: Partial<MealContext> = {}): MealContext => ({
  today: "2026-10-26",
  time: "13:30",
  hitap: "Mert Bey",
  known: [
    { id: "mercimek", name: "Mercimek çorbası" },
    { id: null, name: "Menemen" },
    { id: "tavuk-sote", name: "Tavuk sote" },
  ],
  suggestions: { ogle: { id: "mercimek", name: "Mercimek çorbası", leftover: true } },
  previous: null,
  ...over,
});

describe("detectMealLog — kayıt", () => {
  it.each([
    ["Öğlen menemen yedim", "ogle", "Menemen", null, null],
    ["öğlen menemen yedim 4 puan", "ogle", "Menemen", 4, null],
    ["Akşam yemeğinde tavuk sote yedim, çok güzeldi", "aksam", "Tavuk sote", null, "Çok güzeldi"],
    ["akşam tavuk sote yedim çok güzeldi 5 üzerinden 5", "aksam", "Tavuk sote", 5, "Çok güzeldi"],
    ["Kahvaltıda iki yumurta ve peynir yedim", "kahvalti", "Yumurta ve peynir", null, null],
    ["öğlen kalan mercimeği yedim", "ogle", "Mercimek çorbası", null, null],
    ["Akşam menemeni yedim, dört verdim", "aksam", "Menemen", 4, null],
  ])("%s", (message, mealType, mealName, rating, note) => {
    const r = detectMealLog(message, ctx());
    expect(r.kind).toBe("kayit");
    if (r.kind !== "kayit") return;
    expect(r.entry).toMatchObject({ date: "2026-10-26", mealType, mealName, rating, note });
  });

  it("kalan porsiyon önerisiyle eşleşirse 'kalan' ve tarif bağlantısı", () => {
    const r = detectMealLog("öğlen mercimek çorbası yedim", ctx());
    expect(r).toMatchObject({ kind: "kayit", entry: { mealId: "mercimek", isLeftover: true } });
  });

  it("'dün akşam menemen yedim' düne yazılır", () => {
    expect(detectMealLog("Dün akşam menemen yedim", ctx())).toMatchObject({ kind: "kayit", entry: { date: "2026-10-25", mealType: "aksam" } });
  });

  it("planlı 'öğle vakti' konuşmasına 'yedim' cevabı önerilen yemeği yazar", () => {
    const previous = { content: "Mert Bey, öğle vakti. Kalan mercimek çorbası var, ocakta ısıtın.", proactive: "ogle" };
    expect(detectMealLog("Tamam yedim", ctx({ previous }))).toMatchObject({ kind: "kayit", entry: { mealType: "ogle", mealName: "Mercimek çorbası", isLeftover: true } });
  });
});

describe("detectMealLog — belirsizse tek soru, tahmin yok", () => {
  it("öğün söylenmediyse sorar", () => {
    const r = detectMealLog("Menemen yedim", ctx());
    expect(r).toMatchObject({ kind: "sor", question: "Mert Bey, menemen öğle yemeği olarak mı yazayım?" });
  });
  it("yemek söylenmediyse öneriyi sorar", () => {
    expect(detectMealLog("Öğle yemeğimi yedim", ctx())).toMatchObject({ kind: "sor", question: "Mert Bey, öğle yemeğinde mercimek çorbası mı yediniz?" });
  });
  it("öneri de yoksa ne yediğini sorar; lakapta 'sen'", () => {
    expect(detectMealLog("Akşam yemeğimi yedim", ctx({ hitap: "Kaptan" }))).toMatchObject({ kind: "sor", question: "Kaptan, akşam yemeğinde ne yedin?" });
  });
});

describe("detectMealLog — kayıt sayılmayanlar", () => {
  it.each(["Bugün öğlen bir şey yemedim", "Akşam menemen yiyeceğim", "Dün ne yedim?", "Öğlen ne yesem?", "Maçta 3 gol yedik", "Kafayı yedim bugün"])("%s", (message) => {
    expect(detectMealLog(message, ctx()).kind).toBe("yok");
  });
  it("bugün/dün dışında bir gün kaydedilmez", () => {
    expect(detectMealLog("Geçen salı menemen yedim", ctx()).kind).toBe("baska-gun");
  });
});

describe("resolvePending", () => {
  const pending = { kind: "ogun" as const, date: "2026-10-26", mealType: "ogle" as const, mealId: null, mealName: "Menemen", isLeftover: false, rating: null, note: null };
  it("'evet' → yazar", () => {
    expect(resolvePending(pending, "Evet", [])).toMatchObject({ kind: "ogun", entry: { mealType: "ogle", mealName: "Menemen" } });
  });
  it("'hayır, akşam' → öğün düzeltilir", () => {
    expect(resolvePending(pending, "Hayır, akşam", [])).toMatchObject({ kind: "ogun", entry: { mealType: "aksam", mealName: "Menemen" } });
  });
  it("'hayır' → vazgeçer; ilgisiz cevap → bekleyen iş düşer", () => {
    expect(resolvePending(pending, "Hayır", []).kind).toBe("vazgec");
    expect(resolvePending(pending, "Yarın hava nasıl olacak?", []).kind).toBe("ilgisiz");
  });
  it("'ne yediniz?' sorusuna yemek adı", () => {
    expect(resolvePending({ ...pending, mealName: null }, "Tavuk soteyi", [{ id: "tavuk-sote", name: "Tavuk sote" }])).toMatchObject({
      kind: "ogun",
      entry: { mealName: "Tavuk sote", mealId: "tavuk-sote" },
    });
  });
  it("rutin sorusu: 'evet' işaretler, 'hayır' vazgeçer", () => {
    const p = { kind: "rutin" as const, date: "2026-10-26", items: ["kosu" as const] };
    expect(resolvePending(p, "evet", [])).toEqual({ kind: "rutin", date: "2026-10-26", items: ["kosu"] });
    expect(resolvePending(p, "hayır", []).kind).toBe("vazgec");
  });
});

describe("yardımcılar", () => {
  it("geri al komutu", () => {
    expect(["geri al", "Onu geri al", "son kaydı geri alır mısın?", "Yanlış oldu, geri al"].every(isUndoCommand)).toBe(true);
    expect(["Geri alma", "Koşudan geri geldim, almanca çalıştım", "geri alınacak bir şey var mı diye bakıyorum ama önce şunu anlatayım"].some(isUndoCommand)).toBe(false);
  });
  it("tek başına 'yaptım'", () => {
    expect(isBareDone("Yaptım")).toBe(true);
    expect(isBareDone("Tamam")).toBe(false);
    expect(isBareDone("Koşuyu yaptım")).toBe(false);
  });
  it("puan", () => {
    expect([parseRating("4 puan"), parseRating("puanım 5"), parseRating("10 üzerinden 8"), parseRating("beş üzerinden üç"), parseRating("2 kişilik yaptım")]).toEqual([4, 5, 4, 3, null]);
  });
  it("soru eki ünlü uyumu", () => {
    expect(["çorbası", "menemen", "tavuk", "köfte", "sütlü"].map(questionParticle)).toEqual(["mı", "mi", "mu", "mi", "mü"]);
  });
});
