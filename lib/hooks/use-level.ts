"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { subDays } from "date-fns";
import { computeScoreForDate } from "./use-mertos-score";
import { computeLevel, xpForDay, type LevelInfo } from "@/lib/scoring/xp";

const XP_SCAN_DAYS = 90;

export function useLevel(): LevelInfo | undefined {
  return useLiveQuery(async () => {
    const today = new Date();
    let totalXp = 0;
    for (let i = 0; i <= XP_SCAN_DAYS; i++) {
      const score = await computeScoreForDate(subDays(today, i));
      totalXp += xpForDay(score.total);
    }
    return computeLevel(totalXp);
  }, []);
}
