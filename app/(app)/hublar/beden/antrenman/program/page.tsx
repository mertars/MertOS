"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Play, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateProgramSheet } from "@/components/modules/antrenman/create-program-sheet";
import { useActiveProgram, useProgramProgress } from "@/lib/hooks/db-hooks";
import { getAllPrograms, setActiveProgram } from "@/lib/db/repo/programs";
import { getAllWorkouts } from "@/lib/db/repo/workouts";
import { getCurrentWeekNumber } from "@/lib/programs/engine";
import { cn } from "@/lib/utils";

export default function ProgramPage() {
  const program = useActiveProgram();
  const progress = useProgramProgress(program?.id);
  const allPrograms = useLiveQuery(() => getAllPrograms(), []);
  const allWorkouts = useLiveQuery(() => getAllWorkouts(), []);
  const [createOpen, setCreateOpen] = useState(false);

  if (!program) return null;
  const currentWeek = getCurrentWeekNumber(program, progress);

  const completedByWeek = new Map<number, Set<string>>();
  for (const w of allWorkouts ?? []) {
    if (w.programId !== program.id || w.programWeek == null) continue;
    if (!completedByWeek.has(w.programWeek)) completedByWeek.set(w.programWeek, new Set());
    completedByWeek.get(w.programWeek)!.add(w.programDayId ?? w.id);
  }

  return (
    <>
      <PageHeader eyebrow="Antrenman" title="Program" />
      <div className="px-5 mt-2 pb-4 space-y-4">
        <Card>
          <p className="text-[15px] font-bold text-[var(--color-text-primary)]">{program.name}</p>
          <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-1">{program.description}</p>
        </Card>

        <div>
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2 px-1">Haftalık ilerleme</p>
          <div className="grid grid-cols-4 gap-2">
            {program.weeks.map((week) => {
              const done = completedByWeek.get(week.weekNumber)?.size ?? 0;
              const isCurrent = week.weekNumber === currentWeek;
              return (
                <div
                  key={week.weekNumber}
                  className={cn(
                    "rounded-2xl border p-2.5 text-center",
                    isCurrent ? "border-[var(--color-hareket)] bg-[var(--color-hareket)]/10" : "border-[var(--color-border)] bg-[var(--color-card)]",
                  )}
                >
                  <p className="text-[11px] text-[var(--color-text-secondary)]">Hafta {week.weekNumber}</p>
                  <p className="text-[15px] font-bold text-[var(--color-text-primary)] tabular-nums-tight">
                    {done}/{week.days.length}
                  </p>
                  {week.isDeload && <p className="text-[9px] text-[var(--color-su)] mt-0.5">Deload</p>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          {program.weeks.map((week) => (
            <Card key={week.weekNumber} className={week.weekNumber === currentWeek ? "border-[var(--color-hareket)]/50" : undefined}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                  Hafta {week.weekNumber}
                  {week.weekNumber === currentWeek && (
                    <span className="ml-2 text-[10.5px] font-bold text-[var(--color-hareket)]">ŞİMDİ</span>
                  )}
                </p>
                <p className="text-[11.5px] text-[var(--color-text-tertiary)]">{week.focus}</p>
              </div>
              <div className="space-y-2">
                {week.days.map((day) => (
                  <div key={day.id} className="flex items-center justify-between gap-2 py-1.5">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{day.label}</p>
                      <p className="text-[11px] text-[var(--color-text-tertiary)] truncate">{day.description}</p>
                    </div>
                    <Link
                      href={`/hublar/beden/antrenman/oturum?day=${day.id}&week=${week.weekNumber}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-card-raised)] border border-[var(--color-border)] shrink-0"
                      aria-label={`${day.label} başlat`}
                    >
                      <Play className="h-3.5 w-3.5 text-[var(--color-hareket)]" fill="currentColor" />
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div>
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2 px-1">Diğer programlar</p>
          <div className="space-y-2">
            {(allPrograms ?? [])
              .filter((p) => p.id !== program.id)
              .map((p) => (
                <Card key={p.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{p.name}</p>
                    <p className="text-[11px] text-[var(--color-text-tertiary)]">
                      {p.weeks.reduce((s, w) => s + w.days.length, 0)} gün{p.isCustom ? " · özel" : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setActiveProgram(p.id)}>
                    Etkinleştir
                  </Button>
                </Card>
              ))}
          </div>
        </div>

        <Button variant="secondary" className="w-full" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Kendi Programını Oluştur
        </Button>
      </div>

      <CreateProgramSheet open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
