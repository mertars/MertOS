"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { startOfISOWeek, subDays } from "date-fns";
import { getWaterTotalForDay } from "@/lib/db/repo/water";
import { getCigaretteEntriesForDay } from "@/lib/db/repo/cigarette";
import { getWorkoutsForDate, getWorkoutsInRange } from "@/lib/db/repo/workouts";
import { getCigaretteSettings, getProfile, getSettings } from "@/lib/db";
import {
  computeCigaretteLimit,
  computeDailyScore,
  computeHareketRing,
  computeTemizRing,
  computeWaterGoalMl,
  computeYakitRing,
  DEFAULT_SCORE_WEIGHTS,
  type DailyScoreResult,
} from "@/lib/scoring/engine";
import { getPlannedSessionsThisWeekSoFar } from "@/lib/programs/engine";

const STREAK_SCAN_DAYS = 45;
const STREAK_THRESHOLD = 60;

async function computeScoreForDate(date: Date): Promise<DailyScoreResult> {
  const [profile, cigSettings, settings, waterMl, cigEntries, todayWorkouts] = await Promise.all([
    getProfile(),
    getCigaretteSettings(),
    getSettings(),
    getWaterTotalForDay(date),
    getCigaretteEntriesForDay(date),
    getWorkoutsForDate(date),
  ]);

  const trainedToday = todayWorkouts.length > 0;
  const weekStart = startOfISOWeek(date);
  const weekWorkouts = await getWorkoutsInRange(weekStart, date);
  const completedThisWeek = new Set(weekWorkouts.map((w) => w.date)).size;
  const plannedThisWeek = getPlannedSessionsThisWeekSoFar(date);

  const hareket = computeHareketRing({ trainedToday, completedThisWeek, plannedThisWeek });
  const goalMl = computeWaterGoalMl(profile.weightKg, trainedToday);
  const yakit = computeYakitRing(waterMl, goalMl);
  const limit = computeCigaretteLimit(cigSettings, date);
  const temiz = computeTemizRing(cigEntries.length, limit, cigSettings.quitMode);

  return computeDailyScore({ hareket, yakit, temiz, zihin: null }, settings.scoreWeights ?? DEFAULT_SCORE_WEIGHTS);
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

    let streak = 0;
    for (let i = 1; i <= STREAK_SCAN_DAYS; i++) {
      const d = subDays(today, i);
      const s = await computeScoreForDate(d);
      if (s.total >= STREAK_THRESHOLD) streak++;
      else break;
    }
    if (todayScore.total >= STREAK_THRESHOLD) streak++;

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
