"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useActiveProgram, useProgramProgress } from "@/lib/hooks/db-hooks";
import { getCurrentWeekNumber, getWeekProgressSummary } from "@/lib/programs/engine";
import { getWorkoutsInRange } from "@/lib/db/repo/workouts";
import { KIND_LABEL } from "@/lib/programs/labels";
import { startOfISOWeek, endOfISOWeek } from "date-fns";

export function ProgramWeekCard() {
  const program = useActiveProgram();
  const progress = useProgramProgress(program?.id);

  const weekNumber = program ? getCurrentWeekNumber(program, progress) : 1;
  const week = program?.weeks.find((w) => w.weekNumber === weekNumber);

  const workoutsThisWeek = useLiveQuery(async () => {
    if (!program) return [];
    const now = new Date();
    return getWorkoutsInRange(startOfISOWeek(now), endOfISOWeek(now));
  }, [program?.id, weekNumber]);

  if (!program || !week) return null;

  const summary = getWeekProgressSummary(program, weekNumber, workoutsThisWeek ?? []);
  const completedDayIds = new Set((workoutsThisWeek ?? []).map((w) => w.programDayId));

  return (
    <Link href="/hublar/beden/antrenman/program" className="block">
      <Card>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
            {program.name} · Hafta {weekNumber}/{program.weeks.length}
          </p>
          <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
        </div>
        <p className="text-[12px] text-[var(--color-text-secondary)] mb-3">
          {week.focus} · {summary.completedDays}/{summary.plannedDays} tamamlandı
        </p>
        <div className="space-y-2">
          {week.days.map((day) => {
            const done = completedDayIds.has(day.id);
            return (
              <div key={day.id} className="flex items-center gap-2.5">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-hareket)] shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-[var(--color-text-tertiary)] shrink-0" />
                )}
                <span className="text-[13px] text-[var(--color-text-primary)]">{day.label}</span>
                <span className="text-[11px] text-[var(--color-text-tertiary)] ml-auto">{KIND_LABEL[day.kind]}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </Link>
  );
}
