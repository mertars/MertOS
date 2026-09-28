"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { subDays } from "date-fns";
import { computeScoreForDate } from "./use-mertos-score";
import { getSleepEntryForDate } from "@/lib/db/repo/health";
import { getCigaretteEntriesForDay } from "@/lib/db/repo/cigarette";
import { getWaterTotalForDay } from "@/lib/db/repo/water";
import { getMoodEntriesForDate } from "@/lib/db/repo/zihin";
import { getWorkoutsForDate } from "@/lib/db/repo/workouts";
import { computeAvgPaceMinPerKm } from "@/lib/scoring/kondisyon";
import { pearsonCorrelation, describeCorrelation } from "@/lib/stats/correlation";

export interface CorrelationResult {
  id: string;
  title: string;
  description: string;
  r: number | null;
  points: { x: number; y: number }[];
}

function avg(vals: number[]): number | null {
  return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

export function useCorrelations(days = 30) {
  return useLiveQuery(async (): Promise<CorrelationResult[]> => {
    const today = new Date();
    const dates = Array.from({ length: days }, (_, i) => subDays(today, i));

    const sleepVsScore: { x: number; y: number }[] = [];
    const suVsEnerji: { x: number; y: number }[] = [];
    const antrenmanVsRuhHali: { x: number; y: number }[] = [];
    const sigaraVsPace: { x: number; y: number }[] = [];

    for (const d of dates) {
      const [sleep, score, waterMl, mood, workouts, cigCount] = await Promise.all([
        getSleepEntryForDate(d),
        computeScoreForDate(d),
        getWaterTotalForDay(d),
        getMoodEntriesForDate(d),
        getWorkoutsForDate(d),
        getCigaretteEntriesForDay(d).then((rows) => rows.length),
      ]);

      if (sleep?.durationMin != null) sleepVsScore.push({ x: sleep.durationMin / 60, y: score.total });

      const energyAvg = avg(mood.map((m) => m.energy));
      if (energyAvg != null) suVsEnerji.push({ x: waterMl / 1000, y: energyAvg });

      const moodAvg = avg(mood.map((m) => m.mood));
      if (moodAvg != null) antrenmanVsRuhHali.push({ x: workouts.length > 0 ? 1 : 0, y: moodAvg });

      const runs = workouts.filter((w) => w.type === "kosu" && w.distanceM);
      const pace = computeAvgPaceMinPerKm(runs);
      if (pace != null) sigaraVsPace.push({ x: cigCount, y: pace });
    }

    function build(id: string, title: string, labelA: string, labelB: string, points: { x: number; y: number }[]): CorrelationResult {
      const r = pearsonCorrelation(
        points.map((p) => p.x),
        points.map((p) => p.y),
      );
      return { id, title, description: describeCorrelation(r, labelA, labelB), r, points };
    }

    return [
      build("uyku-skor", "Uyku ↔ Günlük Skor", "uyku süren", "günlük skorun", sleepVsScore),
      build("su-enerji", "Su ↔ Enerji", "su tüketimin", "enerji seviyen", suVsEnerji),
      build("antrenman-ruhhali", "Antrenman ↔ Ruh Hali", "antrenman yapman", "ruh halin", antrenmanVsRuhHali),
      build("sigara-pace", "Sigara ↔ Pace", "günlük sigara sayın", "koşu pace'in", sigaraVsPace),
    ];
  }, [days]);
}
