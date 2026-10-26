import { describe, expect, it } from "vitest";
import { findLeftovers, suggestDayMeals, suggestMeal } from "./meals";
import { addDays } from "./time";
import type { Meal, MealLogRow } from "./types";

const MON = "2026-10-26"; // koşu günü
const TUE = "2026-10-27"; // yürüyüş günü

function meal(id: string, over: Partial<Meal> = {}): Meal {
  return {
    id,
    name: id,
    mealTypes: ["ogle", "aksam"],
    durationMin: 20,
    difficulty: "kolay",
    equipment: ["ocak"],
    steps: [],
    ingredients: [],
    servings: 1,
    reheat: null,
    dayTypes: [],
    tags: [],
    ...over,
  };
}

let nextId = 1;
function log(date: string, mealId: string, over: Partial<MealLogRow> = {}): MealLogRow {
  return { id: nextId++, date, mealType: "ogle", mealId, mealName: mealId, isLeftover: false, rating: null, note: null, repeat: false, createdAt: "", ...over };
}

describe("suggestMeal", () => {
  it("son 5 günde yenen tarifi önermez", () => {
    const meals = [meal("a"), meal("b")];
    const s = suggestMeal({ date: MON, dayType: "kosu", mealType: "ogle", meals, log: [log(addDays(MON, -4), "a")] });
    expect(s.kind === "yeni" && s.meal.id).toBe("b");
  });

  it("tarif azsa 5 gün kuralını gevşetir ama dünkünü asla tekrar etmez", () => {
    const meals = [meal("a"), meal("b")];
    const s = suggestMeal({
      date: MON,
      dayType: "kosu",
      mealType: "ogle",
      meals,
      log: [log(addDays(MON, -1), "a"), log(addDays(MON, -3), "b")],
    });
    expect(s.kind === "yeni" && s.meal.id).toBe("b");
    const none = suggestMeal({ date: MON, dayType: "kosu", mealType: "ogle", meals: [meal("a")], log: [log(addDays(MON, -1), "a")] });
    expect(none.kind).toBe("yok");
  });

  it("koşu gününde hızlı tarifi tercih eder", () => {
    const meals = [meal("uzun", { durationMin: 60 }), meal("hizli", { durationMin: 15 })];
    const s = suggestMeal({ date: MON, dayType: "kosu", mealType: "ogle", meals, log: [] });
    expect(s.kind === "yeni" && s.meal.id).toBe("hizli");
  });

  it("yürüyüş gününde toplu pişirme tarifini tercih eder", () => {
    const meals = [meal("tek"), meal("toplu", { servings: 3, durationMin: 50 })];
    const s = suggestMeal({ date: TUE, dayType: "yuruyus", mealType: "aksam", meals, log: [] });
    expect(s.kind === "yeni" && s.meal.id).toBe("toplu");
  });

  it("aynı gün aynı öğün için deterministiktir", () => {
    const meals = [meal("a"), meal("b"), meal("c"), meal("d")];
    const first = suggestMeal({ date: MON, dayType: "kosu", mealType: "ogle", meals, log: [] });
    const second = suggestMeal({ date: MON, dayType: "kosu", mealType: "ogle", meals, log: [] });
    expect(first).toEqual(second);
  });

  it("'tekrar yap' işaretli tarifi öne alır", () => {
    const meals = [meal("a"), meal("b"), meal("c")];
    const s = suggestMeal({ date: MON, dayType: "kosu", mealType: "ogle", meals, log: [log(addDays(MON, -8), "c", { repeat: true })] });
    expect(s.kind === "yeni" && s.meal.id).toBe("c");
  });

  it("gün tipine uymayan tarifi önermez", () => {
    const meals = [meal("sadece-yuruyus", { dayTypes: ["yuruyus"] }), meal("her-gun")];
    const s = suggestMeal({ date: MON, dayType: "kosu", mealType: "ogle", meals, log: [] });
    expect(s.kind === "yeni" && s.meal.id).toBe("her-gun");
  });
});

describe("toplu pişirme / kalanlar", () => {
  const nohut = meal("nohut", { servings: 3, reheat: "mikrodalga", durationMin: 45 });

  it("pişirildikten sonra kalan porsiyon sayılır", () => {
    const l = [log(TUE, "nohut", { mealType: "aksam" })];
    expect(findLeftovers(addDays(TUE, 1), [nohut], l)).toEqual([{ meal: nohut, cookedOn: TUE, remaining: 2 }]);
  });

  it("kalan önce önerilir, ısıtma yöntemiyle", () => {
    const l = [log(TUE, "nohut", { mealType: "aksam" })];
    const s = suggestMeal({ date: addDays(TUE, 1), dayType: "kosu", mealType: "ogle", meals: [nohut, meal("x")], log: l });
    expect(s.kind).toBe("kalan");
    expect(s.kind === "kalan" && s.reason).toContain("mikrodalga");
  });

  it("porsiyonlar bitince ya da 2 günü geçince kalan önerilmez", () => {
    const eaten = [log(TUE, "nohut"), log(addDays(TUE, 1), "nohut", { isLeftover: true }), log(addDays(TUE, 1), "nohut", { isLeftover: true, mealType: "aksam" })];
    expect(findLeftovers(addDays(TUE, 2), [nohut], eaten)).toEqual([]);
    expect(findLeftovers(addDays(TUE, 3), [nohut], [log(TUE, "nohut")])).toEqual([]);
  });

  it("gün planında öğlen pişirilen toplu tarifin kalanı akşama önerilir", () => {
    const tavuk = meal("tavuk", { servings: 2, mealTypes: ["ogle", "aksam"], durationMin: 40 });
    const plan = suggestDayMeals({ date: TUE, dayType: "yuruyus", meals: [tavuk, meal("y")], log: [] });
    expect(plan.ogle.kind === "yeni" && plan.ogle.meal.id).toBe("tavuk");
    expect(plan.aksam.kind).toBe("kalan");
  });

  it("aynı yeni tarif aynı gün iki öğüne önerilmez", () => {
    const meals = [meal("a", { mealTypes: ["kahvalti", "ogle", "aksam"] }), meal("b", { mealTypes: ["kahvalti", "ogle", "aksam"] }), meal("c", { mealTypes: ["kahvalti", "ogle", "aksam"] })];
    const plan = suggestDayMeals({ date: MON, dayType: "kosu", meals, log: [] });
    const ids = Object.values(plan).map((s) => (s.kind === "yok" ? null : s.meal.id));
    expect(new Set(ids).size).toBe(3);
  });

  it("bugün kaydı olan öğün için öneri üretmez", () => {
    const plan = suggestDayMeals({ date: MON, dayType: "kosu", meals: [meal("a")], log: [], skip: ["ogle"] });
    expect(plan.ogle.kind).toBe("yok");
  });
});
