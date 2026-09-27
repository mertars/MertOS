"use client";

import { Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityRings, type RingSpec } from "@/components/ui/activity-rings";
import { useMertosScore } from "@/lib/hooks/use-mertos-score";

const RING_META: { key: "hareket" | "yakit" | "temiz"; colorVar: string; label: string }[] = [
  { key: "hareket", colorVar: "--color-hareket", label: "Hareket" },
  { key: "yakit", colorVar: "--color-su", label: "Yakıt" },
  { key: "temiz", colorVar: "--color-sigara-temiz", label: "Temiz" },
];

export function ScoreCard() {
  const data = useMertosScore();

  if (!data) {
    return (
      <Card className="flex flex-col items-center py-8">
        <Skeleton className="h-[200px] w-[200px] rounded-full" />
      </Card>
    );
  }

  const rings: RingSpec[] = RING_META.map((m) => ({ key: m.key, colorVar: m.colorVar, value: data.rings[m.key] ?? 0 }));

  return (
    <Card className="flex flex-col items-center py-7">
      <ActivityRings rings={rings} size={200} strokeWidth={16} gap={7}>
        <div className="flex flex-col items-center">
          <span className="text-5xl font-bold tabular-nums-tight text-[var(--color-text-primary)]">{data.total}</span>
          <span className="text-[11px] font-medium text-[var(--color-text-secondary)] -mt-1">MertOS Skoru</span>
        </div>
      </ActivityRings>

      <div className="flex items-center gap-1.5 mt-4 rounded-full bg-white/5 px-3 py-1.5">
        <Flame className="h-4 w-4 text-[var(--color-warning)]" fill="var(--color-warning)" />
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{data.streak} günlük seri</span>
      </div>

      <div className="flex items-center gap-5 mt-5">
        {RING_META.map((m) => (
          <div key={m.key} className="flex flex-col items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `var(${m.colorVar})` }} />
            <span className="text-[11px] text-[var(--color-text-secondary)]">{m.label}</span>
            <span className="text-[13px] font-semibold tabular-nums-tight text-[var(--color-text-primary)]">
              {data.rings[m.key]}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
