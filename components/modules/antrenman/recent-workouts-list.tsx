"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronRight, Dumbbell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAllWorkouts } from "@/lib/db/repo/workouts";
import { KIND_ICON, KIND_LABEL } from "@/lib/programs/labels";

export function RecentWorkoutsList() {
  const workouts = useLiveQuery(async () => (await getAllWorkouts()).slice(0, 6), []);

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">Son Antrenmanlar</p>
        <Link href="/hublar/beden/antrenman/gecmis" className="flex items-center text-[12px] font-medium text-[var(--color-text-secondary)]">
          Tümü <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {workouts && workouts.length > 0 ? (
        workouts.map((w) => {
          const Icon = KIND_ICON[w.type];
          return (
            <div key={w.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--color-border)] last:border-0">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-hareket)]/12 shrink-0">
                <Icon className="h-4 w-4 text-[var(--color-hareket)]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-[var(--color-text-primary)]">{KIND_LABEL[w.type]}</p>
                <p className="text-[11.5px] text-[var(--color-text-tertiary)]">
                  {format(new Date(w.date), "d MMM, EEEE", { locale: tr })} · {Math.round(w.durationSec / 60)} dk
                  {w.distanceM ? ` · ${(w.distanceM / 1000).toFixed(1)} km` : ""}
                </p>
              </div>
            </div>
          );
        })
      ) : (
        <EmptyState icon={<Dumbbell className="h-6 w-6" />} title="Henüz antrenman kaydı yok" description="İlk antrenmanını ekleyerek başla." />
      )}
    </Card>
  );
}
