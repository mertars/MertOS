import { describe, expect, it } from "vitest";
import { parseDayReferences } from "./day-ref";
import { filterExtractedNotes, isGroundedInUserText } from "./memory-extract";
import { checkOutput, dropUnfinishedSentence, enforceLength, findUnknownDates, findUnverifiedMeals, hasWrongHitap } from "./output-check";
import { buildSystemPrompt, pickTone } from "./persona";
import { buildFtsQuery, normalizeTr, wordOverlap } from "./text";

const MON = "2026-10-26";

describe("normalizeTr / FTS sorgusu", () => {
  it("Türkçe karakterleri sadeleştirir", () => {
    expect(normalizeTr("Ispanaklı Yumurta, ÇOK güzel!")).toBe("ispanakli yumurta cok guzel");
    expect(normalizeTr("ıİşĞ")).toBe("iisg");
  });
  it("önek araması üretir, bağlaçları atar", () => {
    expect(buildFtsQuery("Elimde yumurta ve ıspanak var")).toBe('"elimde"* OR "yumurt"* OR "ispana"*');
    expect(buildFtsQuery("ve ile bu")).toBeNull();
  });
  it("kelime örtüşmesi", () => {
    expect(wordOverlap("Ispanağı sevmiyor.", "ıspanağı hiç sevmiyor")).toBe(1);
    expect(wordOverlap("Balık sever", "Tavuk sevmez")).toBe(0);
  });
});

describe("parseDayReferences (2026-10-26 Pazartesi)", () => {
  const cases: [string, string[]][] = [
    ["dün ne yedim?", ["2026-10-25"]],
    ["dünkü yemek güzeldi", ["2026-10-25"]],
    ["2 gün önce ne yemiştim?", ["2026-10-24"]],
    ["iki gün önce", ["2026-10-24"]],
    ["evvelki gün koştum mu", ["2026-10-24"]],
    ["dünden önceki gün", ["2026-10-24"]],
    ["geçen cuma ne yedim", ["2026-10-23"]],
    ["salı günü", ["2026-10-20"]],
    ["pazar akşam", ["2026-10-25"]],
    ["pazartesi", [MON]],
    ["geçen pazartesi", ["2026-10-19"]],
    ["bir hafta önce", ["2026-10-19"]],
    ["dünya çok güzel", []],
    ["pazara gittim", []],
    ["bugün ne yesem", [MON]],
    ["15 Eylül'de ne yedim", ["2026-09-15"]],
    ["3 Aralık", ["2025-12-03"]],
    ["31 Şubat", []],
  ];
  for (const [text, expected] of cases) {
    it(`"${text}"`, () => expect(parseDayReferences(text, MON)).toEqual(expected));
  }
});

describe("pickTone", () => {
  it("spor konusu → koç, yemek konusu → arkadaş", () => {
    expect(pickTone("20:00", "bugün koşmadım")).toBe("koc");
    expect(pickTone("07:00", "elimde yumurta var ne pişireyim")).toBe("arkadas");
  });
  it("konu yoksa saate göre: sabah koç, akşam arkadaş", () => {
    expect(pickTone("07:00", "günaydın")).toBe("koc");
    expect(pickTone("21:00", "nasılsın")).toBe("arkadas");
  });
});

describe("buildSystemPrompt", () => {
  it("hitap ayardan gelir, ses modunda kısa format kuralı", () => {
    const p = buildSystemPrompt({ hitap: "Kaptan", tone: "koc", mode: "ses", today: "x", facts: "y", memories: [], summary: null });
    expect(p).toContain('"Kaptan"');
    expect(p).not.toContain("{hitap}");
    expect(p).toContain("SES MODU");
    expect(p).toContain("DİSİPLİNLİ KOÇ");
  });
});

describe("çıktı kontrolü", () => {
  it("ses modunda en fazla 3 cümle, liste yok", () => {
    const t = enforceLength("- Bir. \n- İki. Üç. Dört. Beş.", "ses");
    expect(t).toBe("Bir. İki. Üç.");
  });
  it("yanlış hitabı yakalar", () => {
    expect(hasWrongHitap("Tamam Mert, hadi.", "Mert Bey")).toBe(true);
    expect(hasWrongHitap("Tamam Mert Bey, hadi.", "Mert Bey")).toBe(false);
    expect(hasWrongHitap("Tamam Mert Bey.", "Mert")).toBe(true);
    expect(hasWrongHitap("Tamam Kaptan.", "Kaptan")).toBe(false);
  });
  it("bağlamda olmayan tarihi yakalar", () => {
    expect(findUnknownDates("24 Ekim'de menemen yediniz.", "24 Ekim Cumartesi: menemen")).toEqual([]);
    expect(findUnknownDates("12 Ekim'de menemen yediniz.", "24 Ekim Cumartesi: menemen")).toEqual(["12 ekim"]);
  });
  it("kayıtta olmayan 'yediniz' yemeğini yakalar, öneriyi yakalamaz", () => {
    const known = ["Menemen", "Tavuklu nohut"];
    expect(findUnverifiedMeals("Dün tavuklu nohut yemiştiniz.", known, "Dün: menemen")).toEqual(["Tavuklu nohut"]);
    expect(findUnverifiedMeals("Bugün tavuklu nohut yapabilirsiniz.", known, "Dün: menemen")).toEqual([]);
    expect(findUnverifiedMeals("Dün menemen yediniz.", known, "Dün: menemen")).toEqual([]);
  });
  it("token sınırında kesilen cevabın yarım cümlesini atar", () => {
    expect(dropUnfinishedSentence("Pilav yapın. Yirmi dakikada tert")).toBe("Pilav yapın.");
    expect(dropUnfinishedSentence("Tamam.")).toBe("Tamam.");
    expect(dropUnfinishedSentence("Seçenekler:\n1. Omlet yapın.\n2. Muffin")).toBe("Seçenekler:\n1. Omlet yapın.");
    expect(dropUnfinishedSentence("Hiç nokta yok")).toBe("Hiç nokta yok…");
    const r = checkOutput({ text: "Mert Bey, pilav yapın. Yirmi dk", truncated: true, mode: "ses", hitap: "Mert Bey", context: "", knownMealNames: [] });
    expect(r.text).toBe("Mert Bey, pilav yapın.");
  });
  it("checkOutput sorunları listeler", () => {
    const r = checkOutput({ text: "Mert, 3 Mart'ta menemen yemiştin.", mode: "yazi", hitap: "Mert Bey", context: "", knownMealNames: ["Menemen"] });
    expect(r.problems.length).toBe(3);
  });
});

describe("hafıza notu süzgeci", () => {
  const userText = "Ben ıspanağı hiç sevmem. Laktoz intoleransım var bu arada.";
  it("Mert'in söylediğine dayanan notu kabul eder, uydurmayı reddeder", () => {
    expect(isGroundedInUserText("Ispanağı sevmiyor.", userText)).toBe(true);
    expect(isGroundedInUserText("Brokoliyi sevmiyor.", userText)).toBe(false);
  });
  it("düşük güveni, hassas kategoride <0.9'u ve tekrarları atar", () => {
    const out = filterExtractedNotes({
      userText,
      existing: ["Ispanağı sevmez."],
      notes: [
        { kategori: "yemek_tercihi", metin: "Ispanağı sevmiyor.", guven: 0.95 }, // tekrar
        { kategori: "saglik", metin: "Laktoz intoleransı var.", guven: 0.85 }, // hassas, düşük güven
        { kategori: "saglik", metin: "Laktoz intoleransı var.", guven: 0.95 },
        { kategori: "yemek_tercihi", metin: "Brokoli sevmiyor.", guven: 0.95 }, // söylenmedi
        { kategori: "diger", metin: "Bu arada.", guven: 0.3 },
      ],
    });
    expect(out.map((n) => n.metin)).toEqual(["Laktoz intoleransı var."]);
  });
});
