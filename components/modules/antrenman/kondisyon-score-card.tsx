"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { startOfISOWeek, subDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { StatNumber } from "@/components/ui/stat";
import { getAllWorkouts, getWorkoutsInRange } from "@/lib/db/repo/workouts";
import { getHeartMetricsInRange } from "@/lib/db/repo/health";
import { db } from "@/lib/db/schema";
import { computeKondisyonSkoru } from "@/lib/scoring/kondisyon";

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function KondisyonScoreCard() {
  const result = useLiveQuery(async () => {
    const now = new Date();
    const all = await getAllWorkouts();
    const recentRuns = all.filter((w) => (w.type === "kosu" || w.type === "yuruyus") && new Date(w.date) >= subDays(now, 30));
    const weekWorkouts = await getWorkoutsInRange(startOfISOWeek(now), now);
    const weeklyVolumeMin = weekWorkouts.reduce((s, w) => s + w.durationSec / 60, 0);

    const heartRows = await getHeartMetricsInRange(subDays(now, 60), now);
    const vo2FromHeart = heartRows.filter((h) => h.vo2max != null).slice(-1)[0]?.vo2max ?? null;
    const vo2FromWorkouts = all.find((w) => typeof w.vo2max === "number" && new Date(w.date) >= subDays(now, 60))?.vo2max ?? null;
    const latestVo2max = vo2FromHeart ?? vo2FromWorkouts ?? null;

    const recentRestingHrAvg = average(heartRows.filter((h) => new Date(h.date) >= subDays(now, 7) && h.restingHr != null).map((h) => h.restingHr!));
    const previousRestingHrAvg = average(
      heartRows.filter((h) => new Date(h.date) >= subDays(now, 14) && new Date(h.date) < subDays(now, 7) && h.restingHr != null).map((h) => h.restingHr!),
    );

    const programs = await db.programs.toArray();
    const active = programs.find((p) => p.isActive);
    const currentWeek = active?.weeks[0];
    const targetWeeklyVolumeMin = currentWeek ? currentWeek.days.reduce((s, d) => s + (d.durationMin ?? 30), 0) : 90;

    return computeKondisyonSkoru({
      recentRuns,
      latestVo2max,
      weeklyVolumeMin,
      targetWeeklyVolumeMin,
      recentRestingHrAvg,
      previousRestingHrAvg,
    });
  }, []);

  if (!result) return null;

  return (
    <Card>
      <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-1">Kondisyon Skoru</p>
      <div className="flex items-end gap-2">
        <StatNumber value={result.score} size="xl" />
        <span className="text-[13px] text-[var(--color-text-secondary)] mb-2">/ 100</span>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3">
        <MiniStat label="Pace" value={result.paceScore} />
        <MiniStat label="VO2max" value={result.vo2maxScore} />
        <MiniStat label="Hacim" value={result.hacimScore} />
        <MiniStat label="Nabız" value={result.restingHrScore} />
      </div>
      {result.avgPaceMinPerKm && (
        <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-3">
          Ort. pace: {result.avgPaceMinPerKm.toFixed(1)} dk/km (son 30 gün)
        </p>
      )}
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="text-center rounded-2xl bg-[var(--color-card-raised)] py-2.5">
      <p className="text-[15px] font-bold tabular-nums-tight text-[var(--color-kondisyon)]">{value ?? "–"}</p>
      <p className="text-[10.5px] text-[var(--color-text-secondary)] mt-0.5">{label}</p>
    </div>
  );
}
