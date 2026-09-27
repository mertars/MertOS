"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { addStrengthSets, addWorkout, dateKey, getWorkout, softDeleteWorkout } from "@/lib/db/repo/workouts";
import { checkRunningRecords, checkStrengthRecords } from "@/lib/programs/records";
import { manualWorkoutSchema, strengthSetSchema, formatZodError } from "@/lib/programs/schemas";
import { KIND_LABEL } from "@/lib/programs/labels";
import { showUndoToast } from "@/lib/store/toast-store";
import { useToastStore } from "@/lib/store/toast-store";
import { uid } from "@/lib/utils";
import type { WorkoutType } from "@/lib/db/types";

const TYPES: WorkoutType[] = ["kosu", "interval", "kuvvet", "halisaha", "yuruyus", "ip_atlama", "serbest"];
const HAS_DISTANCE: WorkoutType[] = ["kosu", "yuruyus", "halisaha", "serbest"];

interface StrengthRow {
  key: string;
  exerciseName: string;
  weightKg: string;
  reps: string;
  rpe: string;
}

function emptyRow(): StrengthRow {
  return { key: uid(), exerciseName: "", weightKg: "", reps: "", rpe: "" };
}

export function ManualEntrySheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [type, setType] = useState<WorkoutType>("kosu");
  const [durationMin, setDurationMin] = useState("30");
  const [distanceKm, setDistanceKm] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [maxHr, setMaxHr] = useState("");
  const [feel, setFeel] = useState(3);
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<StrengthRow[]>([emptyRow()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const push = useToastStore((s) => s.push);

  function reset() {
    setType("kosu");
    setDurationMin("30");
    setDistanceKm("");
    setAvgHr("");
    setMaxHr("");
    setFeel(3);
    setNotes("");
    setRows([emptyRow()]);
    setErrors({});
  }

  async function handleSave() {
    const parsed = manualWorkoutSchema.safeParse({
      type,
      date: dateKey(),
      durationMin,
      distanceKm: distanceKm || undefined,
      avgHr: avgHr || undefined,
      maxHr: maxHr || undefined,
      feel,
      notes: notes || undefined,
    });

    if (!parsed.success) {
      setErrors(formatZodError(parsed.error));
      return;
    }

    const parsedRows: { exerciseName: string; weightKg?: number; reps?: number; rpe?: number }[] = [];
    if (type === "kuvvet") {
      const filled = rows.filter((r) => r.exerciseName.trim().length > 0);
      if (filled.length === 0) {
        setErrors({ rows: "En az bir hareket ekle" });
        return;
      }
      for (const r of filled) {
        const rowParsed = strengthSetSchema.safeParse({
          exerciseName: r.exerciseName,
          weightKg: r.weightKg || undefined,
          reps: r.reps || undefined,
          rpe: r.rpe || undefined,
        });
        if (!rowParsed.success) {
          setErrors({ rows: formatZodError(rowParsed.error).exerciseName ?? "Set bilgilerini kontrol et" });
          return;
        }
        parsedRows.push(rowParsed.data);
      }
    }

    setErrors({});
    const now = new Date();
    const v = parsed.data;

    const workoutId = await addWorkout({
      type: v.type,
      date: v.date,
      startedAt: now.toISOString(),
      endedAt: now.toISOString(),
      durationSec: v.durationMin * 60,
      distanceM: v.distanceKm ? Math.round(v.distanceKm * 1000) : undefined,
      avgHr: v.avgHr,
      maxHr: v.maxHr,
      feel: v.feel as 1 | 2 | 3 | 4 | 5 | undefined,
      notes: v.notes,
      source: "manuel",
    });

    let brokenCount = 0;
    const savedWorkout = await getWorkout(workoutId);
    if (savedWorkout && type === "kuvvet") {
      const sets = await addStrengthSets(
        parsedRows.map((r, i) => ({
          workoutId,
          exerciseId: r.exerciseName.toLowerCase().replace(/\s+/g, "-"),
          exerciseName: r.exerciseName,
          setIndex: i,
          weightKg: r.weightKg,
          reps: r.reps,
          rpe: r.rpe,
        })),
      );
      brokenCount = (await checkStrengthRecords(savedWorkout, sets)).length;
    } else if (savedWorkout && v.distanceKm) {
      brokenCount = (await checkRunningRecords(savedWorkout)).length;
    }

    onOpenChange(false);
    reset();

    if (brokenCount > 0) {
      push({ title: "🎉 Yeni kişisel rekor!", description: `${brokenCount} rekor kırıldı`, variant: "success" });
    } else {
      showUndoToast(`${KIND_LABEL[type]} kaydedildi`, () => softDeleteWorkout(workoutId));
    }
  }

  function updateRow(key: string, patch: Partial<StrengthRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
      title="Antrenman Ekle"
    >
      <div className="space-y-4">
        <div>
          <Label>Tür</Label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-full px-3.5 py-2 text-[13px] font-medium min-h-9 transition-colors ${
                  type === t
                    ? "bg-[var(--color-hareket)] text-black"
                    : "bg-[var(--color-card-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                }`}
              >
                {KIND_LABEL[t]}
              </button>
            ))}
          </div>
          <FieldError>{errors.type}</FieldError>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Süre (dk)</Label>
            <Input inputMode="numeric" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
            <FieldError>{errors.durationMin}</FieldError>
          </div>
          {HAS_DISTANCE.includes(type) && (
            <div>
              <Label>Mesafe (km)</Label>
              <Input inputMode="decimal" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="opsiyonel" />
              <FieldError>{errors.distanceKm}</FieldError>
            </div>
          )}
        </div>

        {type === "kuvvet" && (
          <div>
            <Label>Setler</Label>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.key} className="grid grid-cols-[1fr_56px_48px_44px_28px] gap-1.5 items-center">
                  <Input
                    placeholder="Hareket"
                    value={r.exerciseName}
                    onChange={(e) => updateRow(r.key, { exerciseName: e.target.value })}
                    className="text-[13px] px-2.5"
                  />
                  <Input placeholder="kg" inputMode="decimal" value={r.weightKg} onChange={(e) => updateRow(r.key, { weightKg: e.target.value })} className="text-[13px] px-2" />
                  <Input placeholder="tkr" inputMode="numeric" value={r.reps} onChange={(e) => updateRow(r.key, { reps: e.target.value })} className="text-[13px] px-2" />
                  <Input placeholder="RPE" inputMode="numeric" value={r.rpe} onChange={(e) => updateRow(r.key, { rpe: e.target.value })} className="text-[13px] px-2" />
                  <button onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="text-[var(--color-text-tertiary)] p-1" aria-label="Satırı sil">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setRows((rs) => [...rs, emptyRow()])}
              className="flex items-center gap-1 text-[12.5px] font-medium text-[var(--color-hareket)] mt-2 py-1"
            >
              <Plus className="h-3.5 w-3.5" /> Hareket ekle
            </button>
            <FieldError>{errors.rows}</FieldError>
          </div>
        )}

        {type !== "kuvvet" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ort. nabız</Label>
              <Input inputMode="numeric" value={avgHr} onChange={(e) => setAvgHr(e.target.value)} placeholder="opsiyonel" />
              <FieldError>{errors.avgHr}</FieldError>
            </div>
            <div>
              <Label>Maks nabız</Label>
              <Input inputMode="numeric" value={maxHr} onChange={(e) => setMaxHr(e.target.value)} placeholder="opsiyonel" />
              <FieldError>{errors.maxHr}</FieldError>
            </div>
          </div>
        )}

        <div>
          <Label>Nasıl geçti?</Label>
          <div className="flex gap-2">
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
        </div>

        <div>
          <Label>Not</Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-card-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-text-primary)] outline-none resize-none"
            placeholder="opsiyonel"
          />
          <FieldError>{errors.notes}</FieldError>
        </div>

        <Button variant="accent" accentVar="--color-hareket" onClick={handleSave} className="w-full">
          Kaydet
        </Button>
      </div>
    </Sheet>
  );
}
