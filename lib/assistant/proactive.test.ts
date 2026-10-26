import { describe, expect, it } from "vitest";
import { DEFAULT_CHORES, DEFAULT_SCHEDULE } from "@/data/assistant/defaults";
import { buildDailyBrief } from "./daily";
import { buildProactiveFacts, dueSlot, fallbackProactiveText, slotTimes, slotTone } from "./proactive";
import type { Meal, MealLogRow, RoutineLogRow } from "./types";

// 2026-10-26 Pazartesi (koşu günü)
const MON = "2026-10-26";
const MERCIMEK: Meal = { id: "mercimek", name: "Mercimek çorbası", mealTypes: ["ogle", "aksam"], durationMin: 35, difficulty: "kolay", equipment: ["ocak"], steps: [], ingredients: [], servings: 3, reheat: "ocak", dayTypes: [], tags: [] };

function brief(time: string, opts: { routine?: RoutineLogRow[]; mealLog?: MealLogRow[]; meals?: Meal[]; hitap?: string } = {}) {
  return buildDailyBrief({
    date: MON,
    time,
    hitap: opts.hitap ?? "Mert Bey",
    schedule: DEFAULT_SCHEDULE,
    chores: DEFAULT_CHORES,
    routineLog: opts.routine ?? [],
    meals: opts.meals ?? [],
    mealLog: opts.mealLog ?? [],
  });
}

const done = (item: RoutineLogRow["item"]): RoutineLogRow => ({ date: MON, item, done: true, updatedAt: "" });
const log = (p: Partial<MealLogRow> & Pick<MealLogRow, "id" | "date" | "mealType" | "mealName">): MealLogRow => ({
  mealId: null,
  isLeftover: false,
  rating: null,
  note: null,
  repeat: false,
  createdAt: "",
  ...p,
});

describe("slotTimes", () => {
  it("varsayılan programdan anlar: sabah 06:00, spor 06:30, öğünler, temizlik, proje (su hedefi anı yok)", () => {
    expect(slotTimes(brief("05:00"))).toEqual([
      { slot: "sabah", time: "06:00" },
      { slot: "spor", time: "06:30" },
      { slot: "kahvalti", time: "08:00" },
      { slot: "ogle", time: "13:00" },
      { slot: "aksam", time: "19:30" },
      { slot: "temizlik", time: "20:30" },
      { slot: "proje", time: "21:00" },
    ]);
  });
});

describe("dueSlot", () => {
  it("saat gelince 30 dk boyunca söylenir, sonra geçmiş sayılır", () => {
    expect(dueSlot(brief("12:59"), "12:59", [])).toBeNull();
    expect(dueSlot(brief("13:00"), "13:00", [])).toBe("ogle");
    expect(dueSlot(brief("13:29"), "13:29", [])).toBe("ogle");
    expect(dueSlot(brief("13:30"), "13:30", [])).toBeNull();
  });
  it("bugün söylendiyse tekrar söylenmez", () => {
    expect(dueSlot(brief("13:05"), "13:05", ["ogle"])).toBeNull();
  });
  it("iş zaten yapıldıysa hatırlatmaz: koşu işaretli, öğün kayıtlı, temizlik yapılmış", () => {
    expect(dueSlot(brief("06:40", { routine: [done("kosu")] }), "06:40", [])).toBeNull();
    expect(dueSlot(brief("13:05", { mealLog: [log({ id: 1, date: MON, mealType: "ogle", mealName: "Omlet" })] }), "13:05", [])).toBeNull();
    expect(dueSlot(brief("20:35", { routine: [done("temizlik")] }), "20:35", [])).toBeNull();
  });
  it("sabah rutini tamamen yapıldıysa sabah anı atlanır", () => {
    const r = ["uyanis", "buzlu_su", "hidrasyon", "soguk_dus"].map((i) => done(i as RoutineLogRow["item"]));
    expect(dueSlot(brief("06:10", { routine: r }), "06:10", [])).toBeNull();
    expect(dueSlot(brief("06:10"), "06:10", [])).toBe("sabah");
  });
});

describe("slotTone", () => {
  it("sabah ve spor koç, yemek ve akşam arkadaş", () => {
    expect([slotTone("sabah"), slotTone("spor"), slotTone("ogle"), slotTone("temizlik")]).toEqual(["koc", "koc", "arkadas", "arkadas"]);
  });
});

describe("buildProactiveFacts", () => {
  it("öğle: kalan yemeği pişirme tarihiyle ve önceki puanla verir (koddan, uydurma yok)", () => {
    const mealLog = [
      log({ id: 1, date: "2026-10-10", mealType: "aksam", mealId: "mercimek", mealName: "Mercimek çorbası", rating: 5 }),
      log({ id: 2, date: "2026-10-25", mealType: "aksam", mealId: "mercimek", mealName: "Mercimek çorbası" }),
    ];
    const b = brief("13:00", { meals: [MERCIMEK], mealLog });
    const facts = buildProactiveFacts("ogle", b, mealLog);
    expect(facts).toContain("kalan Mercimek çorbası — pişirme 25 Ekim");
    expect(facts).toContain("en son 25 Ekim (2026-10-25) yendi");
    expect(facts).toContain("Verilen puan: 5/5 (10 Ekim)");
  });
  it("tarif yoksa yemek adı söylenmemesini ister", () => {
    expect(buildProactiveFacts("ogle", brief("13:00"), [])).toContain("Belirli bir yemek ADI SÖYLEME");
  });
  it("proje: GitHub bağlı değil, proje uydurulmaz", () => {
    expect(buildProactiveFacts("proje", brief("21:00"), [])).toContain("proje durumu BİLİNMİYOR");
  });
});

describe("fallbackProactiveText", () => {
  it("model yoksa koddan kısa cümle; hitap ayardan", () => {
    expect(fallbackProactiveText("spor", brief("06:30"))).toBe("Mert Bey, koşu vakti: 6,5 km Zone 2 hafif tempo koşu (nabız üst sınırı 155–160).");
    expect(fallbackProactiveText("ogle", brief("13:00", { hitap: "Kaptan" }))).toBe("Kaptan, öğle vakti. Ne yemek istersin?");
    expect(fallbackProactiveText("sabah", brief("06:00"))).toContain("Günaydın Mert Bey. Sabah rutini: uyanış, buzlu suya yüz, su içme, soğuk duş.");
  });
});
