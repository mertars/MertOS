"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentTimer } from "@/components/modules/antrenman/session/segment-timer";
import { SimpleStopwatch } from "@/components/modules/antrenman/session/simple-stopwatch";
import { StrengthRunner, type LoggedSet } from "@/components/modules/antrenman/session/strength-runner";
import { SessionSummary } from "@/components/modules/antrenman/session/session-summary";
import { useActiveProgram } from "@/lib/hooks/db-hooks";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { buildFinisherSegments, buildIntervalSegments } from "@/lib/session/segments";
import { addStrengthSets, addWorkout, dateKey, getWorkout } from "@/lib/db/repo/workouts";
import { checkRunningRecords, checkStrengthRecords } from "@/lib/programs/records";
import { KIND_LABEL } from "@/lib/programs/labels";
import type { PersonalRecord, WorkoutType } from "@/lib/db/types";
import { AlertTriangle } from "lucide-react";

type Stage = "ana" | "bitirici" | "his" | "ozet";

export default function OturumPage() {
  return (
    <Suspense fallback={null}>
      <OturumContent />
    </Suspense>
  );
}

function OturumContent() {
  useWakeLock(true);
  const searchParams = useSearchParams();
  const dayId = searchParams.get("day");
  const weekParam = searchParams.get("week");
  const freeType = searchParams.get("type") as WorkoutType | null;

  const program = useActiveProgram();

  const day = useMemo(() => {
    if (!dayId || !program || !weekParam) return null;
    const week = program.weeks.find((w) => w.weekNumber === Number(weekParam));
    return week?.days.find((d) => d.id === dayId) ?? null;
  }, [dayId, weekParam, program]);

  const kind = day?.kind ?? freeType ?? "serbest";
  const startedAt = useRef(new Date()).current;

  const [stage, setStage] = useState<Stage>("ana");
  const [finalDurationSec, setFinalDurationSec] = useState(0);
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([]);
  const [feel, setFeel] = useState(3);
  const [distanceKm, setDistanceKm] = useState("");
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [saving, setSaving] = useState(false);

  if (!dayId && !freeType) {
    return (
      <>
        <PageHeader eyebrow="Antrenman" title="Oturum" />
        <div className="px-5">
          <EmptyState
            icon={<AlertTriangle className="h-6 w-6" />}
            title="Oturum bulunamadı"
            description="Antrenman ekranından bir gün seç ya da serbest oturum başlat."
          />
        </div>
      </>
    );
  }

  const intervalSegments = day ? buildIntervalSegments(day) : [];
  const finisherSegments = day ? buildFinisherSegments(day) : [];

  async function finalizeAndSave(finalFeel: number) {
    setSaving(true);
    const endedAt = new Date();
    const durationSec = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));

    const workoutId = await addWorkout({
      type: kind,
      date: dateKey(startedAt),
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationSec,
      distanceM: distanceKm ? Math.round(Number(distanceKm) * 1000) : undefined,
      feel: finalFeel as 1 | 2 | 3 | 4 | 5,
      programId: program?.id,
      programWeek: day ? Number(weekParam) : undefined,
      programDayId: day?.id,
      source: day ? "program" : "canli_oturum",
    });

    const saved = await getWorkout(workoutId);
    let broken: PersonalRecord[] = [];

    if (saved && kind === "kuvvet" && loggedSets.length > 0) {
      const sets = await addStrengthSets(loggedSets.map((s) => ({ ...s, workoutId })));
      broken = await checkStrengthRecords(saved, sets);
    } else if (saved && distanceKm) {
      broken = await checkRunningRecords(saved);
    }

    setRecords(broken);
    setFinalDurationSec(durationSec);
    setSaving(false);
    setStage("ozet");
  }

  const volumeLabel =
    kind === "kuvvet"
      ? `${loggedSets.length} set`
      : distanceKm
        ? `${distanceKm} km`
        : undefined;

  return (
    <>
      <PageHeader eyebrow="Canlı Oturum" title={day?.label ?? KIND_LABEL[kind]} />
      <div className="px-5 mt-2 pb-4">
        {stage === "ana" && kind === "interval" && day && (
          <SegmentTimer
            segments={intervalSegments}
            onComplete={() => setStage(finisherSegments.length > 0 ? "bitirici" : "his")}
          />
        )}

        {stage === "ana" && kind === "kuvvet" && day?.strength && (
          <StrengthRunner
            prescriptions={day.strength}
            onAllComplete={(sets) => {
              setLoggedSets(sets);
              setStage(finisherSegments.length > 0 ? "bitirici" : "his");
            }}
          />
        )}

        {stage === "ana" && kind !== "interval" && kind !== "kuvvet" && (
          <SimpleStopwatch label={day?.label ?? KIND_LABEL[kind]} onFinish={() => setStage("his")} />
        )}

        {stage === "bitirici" && (
          <SegmentTimer segments={finisherSegments} onComplete={() => setStage("his")} />
        )}

        {stage === "his" && (
          <Card>
            <p className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-4">Oturum nasıl geçti?</p>

            {kind !== "kuvvet" && (
              <div className="mb-4">
                <Label>Mesafe (km) — opsiyonel</Label>
                <Input inputMode="decimal" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="opsiyonel" />
              </div>
            )}

            <Label>Zorluk</Label>
            <div className="flex gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((f) => (
                <button
                  key={f}
                  onClick={() => setFeel(f)}
                  className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold min-h-11 ${
                    feel === f ? "bg-[var(--color-kondisyon)] text-white" : "bg-[var(--color-card-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <Button variant="accent" accentVar="--color-hareket" className="w-full" disabled={saving} onClick={() => finalizeAndSave(feel)}>
              {saving ? "Kaydediliyor…" : "Oturumu Kaydet"}
            </Button>
          </Card>
        )}

        {stage === "ozet" && (
          <SessionSummary durationSec={finalDurationSec || 1} volumeLabel={volumeLabel} records={records} />
        )}
      </div>
    </>
  );
}
