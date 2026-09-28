import type { MealEntryItem, MealTemplate, MealType } from "@/lib/db/types";
import { FOOD_DB } from "./foods";

function item(foodId: string, quantity: number): MealEntryItem {
  const food = FOOD_DB.find((f) => f.id === foodId);
  if (!food) throw new Error(`Şablon besini bulunamadı: ${foodId}`);
  return {
    foodId: food.id,
    name: food.name,
    quantity,
    unit: food.unit,
    macro: {
      kcal: Math.round(food.macroPerUnit.kcal * quantity),
      proteinG: Math.round(food.macroPerUnit.proteinG * quantity * 10) / 10,
      carbG: Math.round(food.macroPerUnit.carbG * quantity * 10) / 10,
      fatG: Math.round(food.macroPerUnit.fatG * quantity * 10) / 10,
    },
  };
}

function template(name: string, mealType: MealType, items: MealEntryItem[]): MealTemplate {
  return {
    id: `tpl-${name.toLowerCase().replace(/[^a-zçğıöşü0-9]+/g, "-")}`,
    name,
    mealType,
    items,
    isBuiltIn: true,
    createdAt: "2025-01-01T00:00:00.000Z",
  };
}

export const BUILT_IN_MEAL_TEMPLATES: MealTemplate[] = [
  template("Standart Kahvaltı — Menemen", "kahvalti", [
    item("food-menemen-2-yumurta", 1.75), // 3-4 yumurta
    item("food-tam-bugday-ekmek", 2),
    item("food-domates", 1),
    item("food-salatalik", 1),
  ]),
  template("Standart Kahvaltı — Yulaf Kasesi", "kahvalti", [
    item("food-yulaf-ezmesi-kuru", 0.6),
    item("food-sut-tam-yagli", 1),
    item("food-muz", 1),
    item("food-ceviz", 4),
  ]),
  template("Standart Kahvaltı — Peynir Tabağı", "kahvalti", [
    item("food-lor-peyniri", 0.8),
    item("food-beyaz-peynir-tam-yagli", 0.5),
    item("food-zeytin-yesil", 0.5),
    item("food-domates", 1),
    item("food-salatalik", 1),
    item("food-tam-bugday-ekmek", 2),
  ]),
  template("Antrenman Öncesi — Muzlu Yoğurt", "atistirmalik", [item("food-yogurt-kase", 1), item("food-muz", 1)]),
  template("Antrenman Öncesi — Ballı Ekmek", "atistirmalik", [
    item("food-tam-bugday-ekmek", 1),
    item("food-bal", 1),
    item("food-beyaz-peynir-tam-yagli", 0.3),
  ]),
  template("Antrenman Sonrası — Tavuklu Bulgur", "aksam", [
    item("food-tavuk-gogsu-izgara", 1.5),
    item("food-bulgur-pilavi-pismis", 1.5),
    item("food-brokoli-haslanmis", 1.5),
  ]),
];
