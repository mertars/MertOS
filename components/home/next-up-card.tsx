"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActiveProgram, useProgramProgress } from "@/lib/hooks/db-hooks";
import { getScheduledDayForDate } from "@/lib/programs/engine";
import { getWorkoutsForDate } from "@/lib/db/repo/workouts";
import { PROGRAM_SESSION_HOUR } from "@/lib/programs/kondisyon-8-hafta";
import { KIND_LABEL } from "@/lib/programs/labels";

export function NextUpCard() {
  const program = useActiveProgram();
  const progress = useProgramProgress(program?.id);
  const trainedToday = useLiveQuery(async () => (await getWorkoutsForDate()).length > 0, []);

  if (!program || trainedToday) return null;

  const scheduled = getScheduledDayForDate(program, progress, new Date());
  if (!scheduled) return null;

  return (
    <Card className="px-5">
      <p className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-1">Sıradaki</p>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate">{scheduled.day.label}</p>
          <p className="text-[12.5px] text-[var(--color-text-tertiary)] mt-0.5">
            {String(PROGRAM_SESSION_HOUR.start).padStart(2, "0")}:30 — {KIND_LABEL[scheduled.day.kind]}
            {scheduled.day.durationMin ? `, ${scheduled.day.durationMin} dk` : ""}
          </p>
        </div>
        <Button asChild variant="accent" accentVar="--color-hareket" size="sm">
          <Link href={`/hublar/beden/antrenman/oturum?day=${scheduled.day.id}&week=${scheduled.weekNumber}`}>
            <Play className="h-4 w-4" fill="currentColor" />
            Başlat
          </Link>
        </Button>
      </div>
    </Card>
  );
}
