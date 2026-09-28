import { differenceInYears } from "date-fns";
import type { ActivityLevel, FoodMacro, NutritionGoalMode, Sex } from "@/lib/db/types";
import { clamp } from "@/lib/utils";

/**
 * TDEE / makro hedef motoru — saf fonksiyonlar (Dexie'den bağımsız, test edilebilir).
 * BMR: Mifflin-St Jeor formülü. Aktivite çarpanları klasik 1.2–1.9 aralığı.
 */

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  1: 1.2, // sedanter
  2: 1.375, // hafif aktif
  3: 1.55, // orta aktif
  4: 1.725, // çok aktif
  5: 1.9, // ekstra aktif
};

const MODE_KCAL_DELTA: Record<NutritionGoalMode, number> = {
  koru: 0,
  hafif_bulk: 300,
  cut: -400,
};

export function computeAge(birthDate: string | undefined, at: Date = new Date()): number | null {
  if (!birthDate) return null;
  return differenceInYears(at, new Date(birthDate));
}

export function computeBMR(weightKg: number, heightCm: number, age: number, sex: Sex | undefined): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === "kadin") return base - 161;
  if (sex === "erkek") return base + 5;
  return base - 78; // bilinmiyorsa ortalama bir sabit
}

export function computeTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIER[activityLevel]);
}

export function computeCalorieGoal(tdee: number, mode: NutritionGoalMode): number {
  return Math.round(tdee + MODE_KCAL_DELTA[mode]);
}

export interface MacroGoalInputs {
  weightKg: number;
  calorieGoal: number;
  proteinGPerKg: number;
  isTrainingDay: boolean;
  carbBoostOnTrainingDayPct: number;
  fatPctOfCalories?: number; // varsayılan 0.27
}

export function computeMacroGoals(inputs: MacroGoalInputs): FoodMacro {
  const fatPct = inputs.fatPctOfCalories ?? 0.27;
  const proteinG = Math.round(inputs.weightKg * inputs.proteinGPerKg);
  const proteinKcal = proteinG * 4;
  const fatKcal = inputs.calorieGoal * fatPct;
  const fatG = Math.round(fatKcal / 9);
  const remainingKcal = Math.max(0, inputs.calorieGoal - proteinKcal - fatKcal);
  let carbG = Math.round(remainingKcal / 4);

  if (inputs.isTrainingDay && inputs.carbBoostOnTrainingDayPct > 0) {
    carbG = Math.round(carbG * (1 + inputs.carbBoostOnTrainingDayPct / 100));
  }

  const kcal = Math.round(proteinG * 4 + carbG * 4 + fatG * 9);
  return { kcal, proteinG, carbG, fatG };
}

export function sumMacros(items: FoodMacro[]): FoodMacro {
  return items.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      proteinG: acc.proteinG + m.proteinG,
      carbG: acc.carbG + m.carbG,
      fatG: acc.fatG + m.fatG,
    }),
    { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 },
  );
}

export function macroPercent(consumed: number, goal: number): number {
  if (goal <= 0) return 0;
  return clamp(Math.round((consumed / goal) * 100), 0, 999);
}
