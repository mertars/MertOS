"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { startOfISOWeek, subDays } from "date-fns";
import { getWaterTotalForDay } from "@/lib/db/repo/water";
import { getCigaretteEntriesForDay } from "@/lib/db/repo/cigarette";
import { getWorkoutsForDate, getWorkoutsInRange } from "@/lib/db/repo/workouts";
import { getActivityForDate, getSleepEntryForDate } from "@/lib/db/repo/health";
import { getDailyMacroTotals } from "@/lib/db/repo/meals";
import { getMoodEntriesForDate } from "@/lib/db/repo/zihin";
import { getFocusSessionsInRange } from "@/lib/db/repo/uretkenlik";
import { getCigaretteSettings, getNutritionSettings, getProfile, getSettings } from "@/lib/db";
import {
  computeAge,
  computeBMR,
  computeCalorieGoal,
  computeMacroGoals,
  computeTDEE,
} from "@/lib/nutrition/tdee";
import {
  computeCigaretteLimit,
  computeDailyScore,
  computeFocusRing,
  computeHareketRing,
  computeMoodRing,
  computeSleepRing,
  computeTemizRing,
  computeWaterGoalMl,
  computeYakitRing,
  computeZihinRing,
  DEFAULT_SCORE_WEIGHTS,
  type DailyScoreResult,
} from "@/lib/scoring/engine";
import { clamp } from "@/lib/utils";
import { getPlannedSessionsThisWeekSoFar } from "@/lib/programs/engine";

const STREAK_SCAN_DAYS = 45;
const STREAK_THRESHOLD = 60;

export async function computeScoreForDate(date: Date): Promise<DailyScoreResult> {
  const [profile, cigSettings, nutritionSettings, settings, waterMl, cigEntries, todayWorkouts, activity, macroTotals] = await Promise.all([
    getProfile(),
    getCigaretteSettings(),
    getNutritionSettings(),
    getSettings(),
    getWaterTotalForDay(date),
    getCigaretteEntriesForDay(date),
    getWorkoutsForDate(date),
    getActivityForDate(date),
    getDailyMacroTotals(date),
  ]);

  const trainedToday = todayWorkouts.length > 0;
  const weekStart = startOfISOWeek(date);
  const weekWorkouts = await getWorkoutsInRange(weekStart, date);
  const completedThisWeek = new Set(weekWorkouts.map((w) => w.date)).size;
  const plannedThisWeek = getPlannedSessionsThisWeekSoFar(date);

  const hareket = computeHareketRing({ trainedToday, completedThisWeek, plannedThisWeek, steps: activity?.steps });

  const goalMl = computeWaterGoalMl(profile.weightKg, trainedToday);
  const waterRing = computeYakitRing(waterMl, goalMl);
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
  const macroRing = macroTotals.kcal > 0 ? clamp(Math.round((macroTotals.proteinG / proteinGoal) * 100), 0, 100) : null;
  const yakit = macroRing != null ? Math.round((waterRing + macroRing) / 2) : waterRing;

  const limit = computeCigaretteLimit(cigSettings, date);
  const temiz = computeTemizRing(cigEntries.length, limit, cigSettings.quitMode);

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const [sleepEntry, moodEntries, focusSessions] = await Promise.all([
    getSleepEntryForDate(date),
    getMoodEntriesForDate(date),
    getFocusSessionsInRange(dayStart, dayEnd),
  ]);
  const sleepRing = computeSleepRing(sleepEntry?.durationMin);
  const avg = (vals: number[]) => (vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null);
  const moodRing = computeMoodRing(avg(moodEntries.map((m) => m.mood)), avg(moodEntries.map((m) => m.energy)), avg(moodEntries.map((m) => m.stress)));
  const totalFocusMin = focusSessions.reduce((s, f) => s + f.actualDurationSec, 0) / 60;
  const focusRing = computeFocusRing(totalFocusMin);
  const zihin = computeZihinRing({ sleepRing, moodRing, focusRing });

  return computeDailyScore({ hareket, yakit, temiz, zihin }, settings.scoreWeights ?? DEFAULT_SCORE_WEIGHTS);
}

/** Bugünden geriye doğru tarayarak MertOS Skoru eşiğinin üstünde kalınan ardışık gün sayısını hesaplar. */
export async function computeCurrentStreak(today: Date, todayScore: DailyScoreResult): Promise<number> {
  let streak = 0;
  for (let i = 1; i <= STREAK_SCAN_DAYS; i++) {
    const d = subDays(today, i);
    const s = await computeScoreForDate(d);
    if (s.total >= STREAK_THRESHOLD) streak++;
    else break;
  }
  if (todayScore.total >= STREAK_THRESHOLD) streak++;
  return streak;
}

export interface MertosScoreData extends DailyScoreResult {
  streak: number;
  waterMl: number;
  waterGoalMl: number;
  cigCount: number;
  cigLimit: number;
}

export function useMertosScore() {
  return useLiveQuery(async (): Promise<MertosScoreData> => {
    const today = new Date();
    const todayScore = await computeScoreForDate(today);
    const streak = await computeCurrentStreak(today, todayScore);

    const [profile, waterMl, cigSettings, cigEntries] = await Promise.all([
      getProfile(),
      getWaterTotalForDay(today),
      getCigaretteSettings(),
      getCigaretteEntriesForDay(today),
    ]);
    const trainedToday = (await getWorkoutsForDate(today)).length > 0;

    return {
      ...todayScore,
      streak,
      waterMl,
      waterGoalMl: computeWaterGoalMl(profile.weightKg, trainedToday),
      cigCount: cigEntries.length,
      cigLimit: computeCigaretteLimit(cigSettings, today),
    };
  }, []);
}
