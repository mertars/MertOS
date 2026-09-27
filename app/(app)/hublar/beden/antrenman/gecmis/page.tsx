"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Dumbbell } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EditWorkoutSheet } from "@/components/modules/antrenman/edit-workout-sheet";
import { getAllWorkouts } from "@/lib/db/repo/workouts";
import { KIND_ICON, KIND_LABEL } from "@/lib/programs/labels";
import { groupBy } from "@/lib/utils";
import type { Workout } from "@/lib/db/types";

export default function GecmisPage() {
  const workouts = useLiveQuery(() => getAllWorkouts(), []);
  const [editing, setEditing] = useState<Workout | null>(null);

  const grouped = workouts ? groupBy(workouts, (w) => format(new Date(w.date), "MMMM yyyy", { locale: tr })) : {};

  return (
    <>
      <PageHeader eyebrow="Antrenman" title="Geçmiş" />
      <div className="px-5 mt-2 pb-4 space-y-5">
        {workouts && workouts.length > 0 ? (
          Object.entries(grouped).map(([month, rows]) => (
            <div key={month}>
              <p className="text-[12px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide mb-2 px-1 capitalize">
                {month}
              </p>
              <Card>
                {rows.map((w) => {
                  const Icon = KIND_ICON[w.type];
                  return (
                    <button
                      key={w.id}
                      onClick={() => setEditing(w)}
                      className="w-full flex items-center gap-3 py-2.5 border-b border-[var(--color-border)] last:border-0 text-left"
                    >
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
                    </button>
                  );
                })}
              </Card>
            </div>
          ))
        ) : (
          <EmptyState icon={<Dumbbell className="h-6 w-6" />} title="Henüz antrenman kaydı yok" />
        )}
      </div>

      <EditWorkoutSheet key={editing?.id ?? "none"} workout={editing} onOpenChange={(v) => !v && setEditing(null)} />
    </>
  );
}
