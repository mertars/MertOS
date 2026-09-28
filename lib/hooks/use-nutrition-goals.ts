"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getNutritionSettings, getProfile } from "@/lib/db";
import { getWorkoutsForDate } from "@/lib/db/repo/workouts";
import { computeAge, computeBMR, computeCalorieGoal, computeMacroGoals, computeTDEE } from "@/lib/nutrition/tdee";

/** Profil + beslenme ayarlarından günlük makro hedeflerini hesaplar (antrenman günü karbonhidrat artışı dahil). */
export function useNutritionGoals() {
  return useLiveQuery(async () => {
    const [profile, settings, todaysWorkouts] = await Promise.all([getProfile(), getNutritionSettings(), getWorkoutsForDate()]);
    const weightKg = profile.weightKg ?? 75;
    const heightCm = profile.heightCm ?? 175;
    const age = computeAge(profile.birthDate) ?? 30;
    const bmr = computeBMR(weightKg, heightCm, age, profile.sex);
    const tdee = computeTDEE(bmr, settings.activityLevel);
    const calorieGoal = computeCalorieGoal(tdee, settings.mode);
    const isTrainingDay = todaysWorkouts.length > 0;
    const macros = computeMacroGoals({
      weightKg,
      calorieGoal,
      proteinGPerKg: settings.proteinGPerKg,
      isTrainingDay,
      carbBoostOnTrainingDayPct: settings.carbBoostOnTrainingDayPct,
    });
    return { ...macros, tdee, isTrainingDay, settings };
  }, []);
}
