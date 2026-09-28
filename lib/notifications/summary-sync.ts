"use client";

import { format } from "date-fns";
import { getWaterTotalForDay } from "@/lib/db/repo/water";
import { getCigaretteEntriesForDay, getLastCigaretteEntry } from "@/lib/db/repo/cigarette";
import { getWorkoutsForDate } from "@/lib/db/repo/workouts";
import { getDailyMacroTotals } from "@/lib/db/repo/meals";
import { getCigaretteSettings, getNutritionSettings, getProfile } from "@/lib/db";
import {
  computeAge,
  computeBMR,
  computeCalorieGoal,
  computeMacroGoals,
  computeTDEE,
} from "@/lib/nutrition/tdee";
import { computeCigaretteLimit, computeWaterGoalMl } from "@/lib/scoring/engine";
import { computeCurrentStreak, computeScoreForDate } from "@/lib/hooks/use-mertos-score";
import { getScheduledDayForDate } from "@/lib/programs/engine";
import { db } from "@/lib/db/schema";
import { clamp } from "@/lib/utils";
import type { NotificationSummary } from "./types";

/**
 * Yerel Dexie verisinden bildirim metinlerinde kullanılacak KÜÇÜK bir sayısal
 * özet çıkarır ve `/api/push/summary`'e gönderir. Ham kayıtlar sunucuya hiç
 * gitmez — sadece bu yedi alan (bkz. görev tanımı § 9 / lib/notifications/types.ts).
 */
export async function buildNotificationSummary(): Promise<NotificationSummary> {
  const today = new Date();
  const [profile, nutritionSettings, cigSettings, waterMl, todayWorkouts, cigEntries, lastCig, macroTotals, todayScore] = await Promise.all([
    getProfile(),
    getNutritionSettings(),
    getCigaretteSettings(),
    getWaterTotalForDay(today),
    getWorkoutsForDate(today),
    getCigaretteEntriesForDay(today),
    getLastCigaretteEntry(),
    getDailyMacroTotals(today),
    computeScoreForDate(today),
  ]);

  const trainedToday = todayWorkouts.length > 0;
  const waterGoalMl = computeWaterGoalMl(profile.weightKg, trainedToday);
  const su_kalan = Math.max(0, waterGoalMl - waterMl);

  const sigara_limit = computeCigaretteLimit(cigSettings, today);
  const son_sigara = lastCig ? format(new Date(lastCig.at), "HH:mm") : "—";

  const proteinGoal = computeMacroGoals({
    weightKg: profile.weightKg ?? 75,
    calorieGoal: computeCalorieGoal(
      computeTDEE(computeBMR(profile.weightKg ?? 75, profile.heightCm ?? 175, computeAge(profile.birthDate) ?? 30, profile.sex), nutritionSettings.activityLevel),
      nutritionSettings.mode,
    ),
    proteinGPerKg: nutritionSettings.proteinGPerKg,
    isTrainingDay: trainedToday,
    carbBoostOnTrainingDayPct: nutritionSettings.carbBoostOnTrainingDayPct,
  }).proteinG;
  const protein_kalan = clamp(Math.round(proteinGoal - macroTotals.proteinG), 0, proteinGoal);

  let siradaki_antrenman = "Planlı antrenman yok";
  if (!trainedToday) {
    const allPrograms = await db.programs.toArray();
    const program = allPrograms.find((p) => p.isActive);
    if (program) {
      const progress = await db.programProgress.get(program.id);
      const scheduled = getScheduledDayForDate(program, progress, today);
      if (scheduled) siradaki_antrenman = scheduled.day.label;
    }
  }

  const seri = await computeCurrentStreak(today, todayScore);

  return {
    isim: profile.name || "Mert",
    su_kalan,
    sigara_bugun: cigEntries.length,
    sigara_limit,
    son_sigara,
    seri,
    siradaki_antrenman,
    protein_kalan,
    updatedAt: new Date().toISOString(),
  };
}

/** Özeti hesaplayıp sunucuya gönderir — bildirim sunucusu yapılandırılmamışsa sessizce yutar. */
export async function syncNotificationSummary(): Promise<void> {
  try {
    const summary = await buildNotificationSummary();
    await fetch("/api/push/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(summary),
    });
  } catch {
    // Sessizce yut — bu arka plan senkronizasyonu, kullanıcı akışını bloklamamalı.
  }
}
