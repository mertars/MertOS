"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { format, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { computeScoreForDate } from "./use-mertos-score";

export interface ScoreTrendPoint {
  label: string;
  score: number;
}

export interface ScoreTrend {
  points: ScoreTrendPoint[];
  avg: number;
  prevAvg: number;
  changePercent: number | null;
}

export function useScoreTrend(days: number) {
  return useLiveQuery(async (): Promise<ScoreTrend> => {
    const today = new Date();
    const points: ScoreTrendPoint[] = [];
    let sum = 0;
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(today, i);
      const s = await computeScoreForDate(d);
      points.push({ label: format(d, days > 30 ? "d MMM" : "d MMM", { locale: tr }), score: s.total });
      sum += s.total;
    }
    const avg = Math.round(sum / days);

    let prevSum = 0;
    for (let i = days * 2 - 1; i >= days; i--) {
      const d = subDays(today, i);
      const s = await computeScoreForDate(d);
      prevSum += s.total;
    }
    const prevAvg = Math.round(prevSum / days);
    const changePercent = prevAvg > 0 ? Math.round(((avg - prevAvg) / prevAvg) * 100) : null;

    return { points, avg, prevAvg, changePercent };
  }, [days]);
}
