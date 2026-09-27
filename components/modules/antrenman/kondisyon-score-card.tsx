"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { startOfISOWeek, subDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { StatNumber } from "@/components/ui/stat";
import { getAllWorkouts, getWorkoutsInRange } from "@/lib/db/repo/workouts";
import { db } from "@/lib/db/schema";
import { computeKondisyonSkoru } from "@/lib/scoring/kondisyon";

export function KondisyonScoreCard() {
  const result = useLiveQuery(async () => {
    const now = new Date();
    const all = await getAllWorkouts();
    const recentRuns = all.filter((w) => (w.type === "kosu" || w.type === "yuruyus") && new Date(w.date) >= subDays(now, 30));
    const weekWorkouts = await getWorkoutsInRange(startOfISOWeek(now), now);
    const weeklyVolumeMin = weekWorkouts.reduce((s, w) => s + w.durationSec / 60, 0);
    const vo2Rows = all.filter((w) => typeof w.vo2max === "number" && new Date(w.date) >= subDays(now, 60));
    const latestVo2max = vo2Rows.length > 0 ? vo2Rows[0].vo2max! : null;

    const programs = await db.programs.toArray();
    const active = programs.find((p) => p.isActive);
    const currentWeek = active?.weeks[0];
    const targetWeeklyVolumeMin = currentWeek ? currentWeek.days.reduce((s, d) => s + (d.durationMin ?? 30), 0) : 90;

    return computeKondisyonSkoru({ recentRuns, latestVo2max, weeklyVolumeMin, targetWeeklyVolumeMin });
  }, []);

  if (!result) return null;

  return (
    <Card>
      <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-1">Kondisyon Skoru</p>
      <div className="flex items-end gap-2">
        <StatNumber value={result.score} size="xl" />
        <span className="text-[13px] text-[var(--color-text-secondary)] mb-2">/ 100</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <MiniStat label="Pace" value={result.paceScore} />
        <MiniStat label="VO2max" value={result.vo2maxScore} />
        <MiniStat label="Hacim" value={result.hacimScore} />
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
