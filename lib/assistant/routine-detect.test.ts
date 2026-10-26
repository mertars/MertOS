import { describe, expect, it } from "vitest";
import { DEFAULT_SCHEDULE } from "@/data/assistant/defaults";
import { dayTypeFor, routineItemsForDay } from "./daily";
import { detectRoutineDone } from "./routine-detect";

// 2026-10-26 Pazartesi (koşu günü), 2026-10-25 Pazar (koşu), 2026-10-24 Cumartesi (yürüyüş).
const MON = "2026-10-26";
const itemsForDate = (date: string) => routineItemsForDay(DEFAULT_SCHEDULE, dayTypeFor(date));

function detect(message: string, opts: { time?: string; prev?: string } = {}) {
  return detectRoutineDone({ message, previousAssistant: opts.prev ?? null, today: MON, time: opts.time ?? "08:00", itemsForDate });
}

describe("detectRoutineDone — 'yaptım' cümleleri", () => {
  it.each([
    ["Koştum.", ["kosu"]],
    ["Koşudan döndüm", ["kosu"]],
    ["Koşuyu bitirdim", ["kosu"]],
    ["Koşu tamam", ["kosu"]],
    ["Koştum ve duş aldım, işaretler misin?", ["soguk_dus", "kosu"]],
    ["Koştum, duş da aldım.", ["soguk_dus", "kosu"]],
    ["Koşuyu ve duşu yaptım", ["soguk_dus", "kosu"]],
    ["6'da kalktım, yüzümü buza soktum, su içtim, soğuk duş aldım.", ["uyanis", "buzlu_su", "hidrasyon", "soguk_dus"]],
    ["Sabah rutinini yaptım", ["uyanis", "buzlu_su", "hidrasyon", "soguk_dus"]],
    ["Hidrasyonu yaptım, soğuk duş da aldım", ["hidrasyon", "soguk_dus"]],
  ])("%s", (message, expected) => {
    const r = detect(message, { time: message.includes("kalktım") || message.includes("Sabah") ? "07:00" : "08:00" });
    expect(r.date).toBe(MON);
    expect(r.items).toEqual(expected);
  });

  it("akşam '2 litre su içtim' günlük su hedefidir", () => {
    expect(detect("Bugün 2 litre su içtim", { time: "21:00" }).items).toEqual(["su"]);
    expect(detect("Su hedefini tamamladım", { time: "21:00" }).items).toEqual(["su"]);
  });
});

describe("detectRoutineDone — işaretlenmemesi gerekenler", () => {
  it.each([
    "Bugün koşmadım.",
    "Duş almadım daha",
    "Yarın koşacağım",
    "Birazdan koşuya çıkıyorum",
    "Koşmalıyım ama üşeniyorum",
    "Koşsam mı?",
    "Koştum mu ben dün?",
    "Koşuyu atladım",
    "Tamam, koşuya çıkıyorum",
    "Selam, nasılsın?",
    "Şu işi yaptım",
    "Mesajı sildim",
    "Elimde yumurta ve ıspanak var, ne yapabilirim?",
  ])("%s", (message) => {
    expect(detect(message).items).toEqual([]);
  });

  it("karşıtlık: 'koştum ama duş almadım' yalnızca koşu", () => {
    expect(detect("Koştum ama duş almadım").items).toEqual(["kosu"]);
  });

  it("öğleden sonra 'kalktım / su içtim' sabah rutini sayılmaz", () => {
    expect(detect("Kalktım, su içtim", { time: "15:00" }).items).toEqual([]);
    expect(detect("Sabah 6'da kalktım", { time: "15:00" }).items).toEqual(["uyanis"]);
  });

  it("'akşam' kelimesi koşul eki sanılmaz", () => {
    expect(detect("Akşam yürüyüşü yaptım", { time: "21:00" }).notInPlan).toEqual(["yuruyus"]);
  });
});

describe("detectRoutineDone — gün ve program", () => {
  it("'dün yürüdüm' dünün (yürüyüş değil, koşu günü) programına bakar", () => {
    const r = detect("Dün koştum");
    expect(r.date).toBe("2026-10-25");
    expect(r.items).toEqual(["kosu"]);
  });
  it("programda olmayan madde ayrı döner (koşu gününde yürüyüş)", () => {
    const r = detect("Yürüdüm, duvarda oturdum");
    expect(r.items).toEqual([]);
    expect(r.notInPlan).toEqual(["yuruyus", "wall_sit"]);
  });
  it("eski ya da birden çok gün anılınca hiçbir şey işaretlenmez", () => {
    expect(detect("15 Eylül'de koştum").items).toEqual([]);
    expect(detect("Dün koşmadım ama bugün koştum").items).toEqual([]);
  });
  it("geçmiş güne yalnızca açıkça 'dün' denirse: '2 gün önce' / 'geçen cumartesi' işaretlenmez", () => {
    expect(detect("2 gün önce yürüdüm")).toMatchObject({ items: [], otherDay: true });
    expect(detect("Geçen cumartesi yürüdüm")).toMatchObject({ items: [], otherDay: true });
  });
  it("temizlik sohbetten işaretlenmez (yalnızca Bugün ekranından)", () => {
    expect(detect("Bulaşıkları yıkadım")).toMatchObject({ items: [], notAllowed: ["temizlik"] });
    expect(detect("Koştum, temizliği de hallettim")).toMatchObject({ items: ["kosu"], notAllowed: ["temizlik"] });
  });
});

describe("detectRoutineDone — asistanın sorusuna cevap", () => {
  const prev = "Günaydın Mert Bey! Koşuyu ve soğuk duşu yaptınız mı?";
  it("'evet' sorulan maddeleri işaretler", () => {
    expect(detect("Evet", { prev }).items).toEqual(["soguk_dus", "kosu"]);
    expect(detect("İkisini de yaptım", { prev }).items).toEqual(["soguk_dus", "kosu"]);
    expect(detect("Koştunuz mu?", { prev: "Evet" }).items).toEqual([]);
  });
  it("'evet ama duş almadım' → yalnızca koşu", () => {
    expect(detect("Evet ama duş almadım", { prev }).items).toEqual(["kosu"]);
  });
  it("'hayır' ya da soru yoksa 'evet' bir şey işaretlemez", () => {
    expect(detect("Hayır", { prev }).items).toEqual([]);
    expect(detect("Evet", { prev: "Koşu güzel geçti." }).items).toEqual([]);
  });
  it("'Koştunuz mu?' sorusu da anlaşılır", () => {
    expect(detect("Evet", { prev: "Bugün koştunuz mu?" }).items).toEqual(["kosu"]);
  });
});
