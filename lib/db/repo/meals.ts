import { db } from "@/lib/db/schema";
import type { FoodItem, MealEntry, MealEntryItem, MealType, NutritionSettings } from "@/lib/db/types";
import { SINGLETON_IDS } from "@/lib/db";
import { uid } from "@/lib/utils";
import { startOfLocalDayIso, endOfLocalDayIso } from "./water";
import { sumMacros } from "@/lib/nutrition/tdee";

export async function searchFoods(query: string): Promise<FoodItem[]> {
  const all = await db.foods.toArray();
  const q = query.trim().toLowerCase();
  if (!q) return all.slice(0, 30);
  return all.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 40);
}

export async function getFood(id: string): Promise<FoodItem | undefined> {
  return db.foods.get(id);
}

export async function addCustomFood(input: Omit<FoodItem, "id" | "isCustom" | "createdAt">): Promise<FoodItem> {
  const food: FoodItem = { ...input, id: uid(), isCustom: true, createdAt: new Date().toISOString() };
  await db.foods.add(food);
  return food;
}

export function buildMealItem(food: FoodItem, quantity: number): MealEntryItem {
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

export async function addMealEntry(input: {
  mealType: MealType;
  items: MealEntryItem[];
  at?: Date;
  photoId?: string;
  note?: string;
}): Promise<string> {
  const id = uid();
  const at = input.at ?? new Date();
  const entry: MealEntry = {
    id,
    date: at.toISOString().slice(0, 10),
    at: at.toISOString(),
    mealType: input.mealType,
    items: input.items,
    photoId: input.photoId,
    note: input.note,
    createdAt: new Date().toISOString(),
  };
  await db.mealEntries.add(entry);
  return id;
}

export async function softDeleteMealEntry(id: string) {
  await db.mealEntries.update(id, { deletedAt: new Date().toISOString() });
}

export async function restoreMealEntry(id: string) {
  await db.mealEntries.update(id, { deletedAt: null });
}

export async function getMealEntriesForDate(date: Date = new Date()): Promise<MealEntry[]> {
  const start = startOfLocalDayIso(date);
  const end = endOfLocalDayIso(date);
  const rows = await db.mealEntries.where("at").between(start, end, true, true).toArray();
  return rows.filter((r) => !r.deletedAt).sort((a, b) => a.at.localeCompare(b.at));
}

export async function getMealEntriesInRange(start: Date, end: Date): Promise<MealEntry[]> {
  const rows = await db.mealEntries.where("at").between(start.toISOString(), end.toISOString(), true, true).toArray();
  return rows.filter((r) => !r.deletedAt);
}

export async function getDailyMacroTotals(date: Date = new Date()) {
  const entries = await getMealEntriesForDate(date);
  return sumMacros(entries.flatMap((e) => e.items.map((i) => i.macro)));
}

export async function getMealTemplates() {
  return db.mealTemplates.toArray();
}

export async function addMealFromTemplate(templateId: string, at: Date = new Date()): Promise<string> {
  const tpl = await db.mealTemplates.get(templateId);
  if (!tpl) throw new Error("Şablon bulunamadı");
  return addMealEntry({ mealType: tpl.mealType, items: tpl.items, at });
}

export async function savePhoto(blob: Blob): Promise<string> {
  const id = uid();
  await db.mealPhotos.add({ id, blob, createdAt: new Date().toISOString() });
  return id;
}

export async function getPhotoBlob(id: string): Promise<Blob | undefined> {
  const row = await db.mealPhotos.get(id);
  return row?.blob;
}

export async function updateNutritionSettings(patch: Partial<NutritionSettings>) {
  await db.nutritionSettings.update(SINGLETON_IDS.NUTRITION_SETTINGS_ID, { ...patch, updatedAt: new Date().toISOString() });
}
