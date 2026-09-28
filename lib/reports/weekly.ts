import { endOfISOWeek, format, startOfISOWeek, subWeeks } from "date-fns";
import { tr } from "date-fns/locale";
import { computeScoreForDate } from "@/lib/hooks/use-mertos-score";
import { getAllPersonalRecords } from "@/lib/programs/records";
import { getCigaretteEntriesForDay } from "@/lib/db/repo/cigarette";
import type { RingKey } from "@/lib/scoring/engine";

const RING_LABEL: Record<RingKey, string> = { hareket: "Hareket", yakit: "Yakıt", temiz: "Temiz", zihin: "Zihin" };
const RING_ADVICE: Record<RingKey, string> = {
  hareket: "Bu hafta bir antrenman daha ekle ya da günlük adımını artır.",
  yakit: "Su ve protein hedeflerine biraz daha dikkat et.",
  temiz: "Sigara limitine daha sıkı uy — tetikleyicilerini not almayı dene.",
  zihin: "Uykuna ve hızlı ruh hali kayıtlarına zaman ayır.",
};

export interface WeeklyReport {
  weekLabel: string;
  avgScore: number;
  prevAvgScore: number;
  changePercent: number | null;
  bestDay: { label: string; score: number } | null;
  newRecords: { label: string; date: string }[];
  cigThisWeek: number;
  cigPrevWeek: number;
  focusAreas: { ring: RingKey; label: string; advice: string; avg: number }[];
}

export async function generateWeeklyReport(referenceDate: Date = new Date()): Promise<WeeklyReport> {
  const weekStart = startOfISOWeek(referenceDate);
  const weekEnd = endOfISOWeek(referenceDate);
  const prevWeekStart = subWeeks(weekStart, 1);

  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86_400_000)).filter((d) => d <= referenceDate);
  const prevDays = Array.from({ length: 7 }, (_, i) => new Date(prevWeekStart.getTime() + i * 86_400_000));

  const scores = await Promise.all(days.map((d) => computeScoreForDate(d)));
  const prevScores = await Promise.all(prevDays.map((d) => computeScoreForDate(d)));

  const avgScore = scores.length ? Math.round(scores.reduce((s, r) => s + r.total, 0) / scores.length) : 0;
  const prevAvgScore = prevScores.length ? Math.round(prevScores.reduce((s, r) => s + r.total, 0) / prevScores.length) : 0;
  const changePercent = prevAvgScore > 0 ? Math.round(((avgScore - prevAvgScore) / prevAvgScore) * 100) : null;

  let bestDay: WeeklyReport["bestDay"] = null;
  scores.forEach((s, i) => {
    if (!bestDay || s.total > bestDay.score) bestDay = { label: format(days[i], "EEEE", { locale: tr }), score: s.total };
  });

  const allRecords = await getAllPersonalRecords();
  const newRecords = allRecords
    .filter((r) => new Date(r.date) >= weekStart && new Date(r.date) <= weekEnd)
    .map((r) => ({ label: r.label, date: r.date }));

  const cigCounts = await Promise.all(days.map((d) => getCigaretteEntriesForDay(d).then((r) => r.length)));
  const cigPrevCounts = await Promise.all(prevDays.map((d) => getCigaretteEntriesForDay(d).then((r) => r.length)));
  const cigThisWeek = cigCounts.reduce((s, c) => s + c, 0);
  const cigPrevWeek = cigPrevCounts.reduce((s, c) => s + c, 0);

  const ringAverages: Record<RingKey, number[]> = { hareket: [], yakit: [], temiz: [], zihin: [] };
  for (const s of scores) {
    (Object.keys(ringAverages) as RingKey[]).forEach((k) => {
      const v = s.rings[k];
      if (v != null) ringAverages[k].push(v);
    });
  }
  const ringAvgList = (Object.keys(ringAverages) as RingKey[])
    .map((k) => ({ ring: k, avg: ringAverages[k].length ? ringAverages[k].reduce((s, v) => s + v, 0) / ringAverages[k].length : 100 }))
    .sort((a, b) => a.avg - b.avg);

  const focusAreas = ringAvgList.slice(0, 3).map((r) => ({ ring: r.ring, label: RING_LABEL[r.ring], advice: RING_ADVICE[r.ring], avg: Math.round(r.avg) }));

  return {
    weekLabel: `${format(weekStart, "d MMM", { locale: tr })} – ${format(weekEnd, "d MMM", { locale: tr })}`,
    avgScore,
    prevAvgScore,
    changePercent,
    bestDay,
    newRecords,
    cigThisWeek,
    cigPrevWeek,
    focusAreas,
  };
}
