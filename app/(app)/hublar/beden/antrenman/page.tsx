"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Play, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { ProgramWeekCard } from "@/components/modules/antrenman/program-week-card";
import { KondisyonScoreCard } from "@/components/modules/antrenman/kondisyon-score-card";
import { RecordsCard } from "@/components/modules/antrenman/records-card";
import { RecentWorkoutsList } from "@/components/modules/antrenman/recent-workouts-list";
import { ManualEntrySheet } from "@/components/modules/antrenman/manual-entry-sheet";
import { useActiveProgram, useProgramProgress } from "@/lib/hooks/db-hooks";
import { getScheduledDayForDate } from "@/lib/programs/engine";

export default function AntrenmanPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const program = useActiveProgram();
  const progress = useProgramProgress(program?.id);
  const scheduled = program ? getScheduledDayForDate(program, progress, new Date()) : null;

  return (
    <>
      <PageHeader
        eyebrow="Beden"
        title="Antrenman"
        right={
          <Button size="icon" variant="secondary" onClick={() => setSheetOpen(true)} aria-label="Antrenman ekle">
            <Plus className="h-4 w-4" />
          </Button>
        }
      />
      <Suspense fallback={null}>
        <AutoOpenFromQuery onOpen={() => setSheetOpen(true)} />
      </Suspense>

      <div className="px-5 mt-2 space-y-4 pb-4">
        {scheduled ? (
          <Button asChild variant="accent" accentVar="--color-hareket" className="w-full">
            <Link href={`/hublar/beden/antrenman/oturum?day=${scheduled.day.id}&week=${scheduled.weekNumber}`}>
              <Play className="h-4 w-4" fill="currentColor" />
              {scheduled.day.label} — Başlat
            </Link>
          </Button>
        ) : (
          <Button asChild variant="secondary" className="w-full">
            <Link href="/hublar/beden/antrenman/oturum?type=serbest">
              <Play className="h-4 w-4" fill="currentColor" />
              Serbest Oturum Başlat
            </Link>
          </Button>
        )}

        <ProgramWeekCard />
        <KondisyonScoreCard />
        <RecordsCard />
        <RecentWorkoutsList />
      </div>

      <ManualEntrySheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}

function AutoOpenFromQuery({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shouldOpen = searchParams.get("ekle") === "1";

  useEffect(() => {
    if (!shouldOpen) return;
    onOpen();
    router.replace("/hublar/beden/antrenman");
  }, [shouldOpen, onOpen, router]);

  return null;
}
