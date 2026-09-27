"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { deleteStrengthSetsForWorkout, softDeleteWorkout, updateWorkout } from "@/lib/db/repo/workouts";
import { manualWorkoutSchema, formatZodError } from "@/lib/programs/schemas";
import { KIND_LABEL } from "@/lib/programs/labels";
import { showUndoToast } from "@/lib/store/toast-store";
import type { Workout } from "@/lib/db/types";

/** Not: bu bileşen, farklı bir `workout` seçildiğinde formu sıfırlamak için üst
 * bileşen tarafından `key={workout.id}` ile yeniden monte edilecek şekilde
 * kullanılmalıdır (bkz. gecmis/page.tsx). Bu sayede alan başlangıç değerleri
 * bir efekt yerine güvenli lazy state initializer'larla ayarlanabilir. */
export function EditWorkoutSheet({ workout, onOpenChange }: { workout: Workout | null; onOpenChange: (v: boolean) => void }) {
  const [durationMin, setDurationMin] = useState(() => String(Math.round((workout?.durationSec ?? 0) / 60)));
  const [distanceKm, setDistanceKm] = useState(() => (workout?.distanceM ? String(workout.distanceM / 1000) : ""));
  const [notes, setNotes] = useState(() => workout?.notes ?? "");
  const [feel, setFeel] = useState(() => workout?.feel ?? 3);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!workout) return null;

  async function handleSave() {
    const parsed = manualWorkoutSchema.safeParse({
      type: workout!.type,
      date: workout!.date,
      durationMin,
      distanceKm: distanceKm || undefined,
      feel,
      notes: notes || undefined,
    });
    if (!parsed.success) {
      setErrors(formatZodError(parsed.error));
      return;
    }
    await updateWorkout(workout!.id, {
      durationSec: parsed.data.durationMin * 60,
      distanceM: parsed.data.distanceKm ? Math.round(parsed.data.distanceKm * 1000) : undefined,
      feel: parsed.data.feel as 1 | 2 | 3 | 4 | 5 | undefined,
      notes: parsed.data.notes,
    });
    onOpenChange(false);
  }

  async function handleDelete() {
    const id = workout!.id;
    await softDeleteWorkout(id);
    if (workout!.type === "kuvvet") await deleteStrengthSetsForWorkout(id);
    onOpenChange(false);
    showUndoToast(`${KIND_LABEL[workout!.type]} kaydı silindi`, () => updateWorkout(id, { deletedAt: null }));
  }

  return (
    <Sheet open={Boolean(workout)} onOpenChange={onOpenChange} title={`${KIND_LABEL[workout.type]} kaydını düzenle`}>
      <div className="space-y-4">
        <div>
          <Label>Süre (dk)</Label>
          <Input inputMode="numeric" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
          <FieldError>{errors.durationMin}</FieldError>
        </div>
        <div>
          <Label>Mesafe (km)</Label>
          <Input inputMode="decimal" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="opsiyonel" />
          <FieldError>{errors.distanceKm}</FieldError>
        </div>
        <div>
          <Label>Zorluk</Label>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map((f) => (
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
        </div>
        <div>
          <Label>Not</Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-card-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-text-primary)] outline-none resize-none"
          />
          <FieldError>{errors.notes}</FieldError>
        </div>

        <div className="flex gap-2.5">
          <Button variant="danger" onClick={handleDelete} className="flex-1">
            Sil
          </Button>
          <Button variant="accent" accentVar="--color-hareket" onClick={handleSave} className="flex-1">
            Kaydet
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
