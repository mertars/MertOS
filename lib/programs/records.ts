import type { PersonalRecord, StrengthSet, Workout } from "@/lib/db/types";
import { db } from "@/lib/db/schema";
import { uid } from "@/lib/utils";

const DISTANCE_TOLERANCE = 0.05; // ±%5 — "1 km" hedefi 950-1050 m arası kabul edilir

const DISTANCE_TARGETS: { category: string; label: string; meters: number }[] = [
  { category: "run_1k", label: "En iyi 1 km", meters: 1000 },
  { category: "run_5k", label: "En iyi 5 km", meters: 5000 },
  { category: "run_10k", label: "En iyi 10 km", meters: 10000 },
];

async function upsertBestRecord(category: string, label: string, value: number, unit: string, date: string, workoutId: string, better: (a: number, b: number) => boolean) {
  const existing = await db.personalRecords.where("category").equals(category).first();
  if (!existing || better(value, existing.value)) {
    const record: PersonalRecord = {
      id: existing?.id ?? uid(),
      category,
      label,
      value,
      unit,
      date,
      workoutId,
      createdAt: new Date().toISOString(),
    };
    await db.personalRecords.put(record);
    return record;
  }
  return null;
}

/** Bir koşu/interval antrenmanı kaydedildikten sonra kişisel rekorları günceller. Kırılan rekorları döndürür. */
export async function checkRunningRecords(workout: Workout): Promise<PersonalRecord[]> {
  if (!workout.distanceM || workout.durationSec <= 0) return [];
  const broken: PersonalRecord[] = [];

  for (const target of DISTANCE_TARGETS) {
    const diff = Math.abs(workout.distanceM - target.meters) / target.meters;
    if (diff > DISTANCE_TOLERANCE) continue;
    // Mesafeyi hedefe normalize ederek süreyi ölçekle (ör. 1080 m'yi 1000 m'ye orantıla).
    const normalizedSec = workout.durationSec * (target.meters / workout.distanceM);
    const r = await upsertBestRecord(target.category, target.label, Math.round(normalizedSec), "sn", workout.date, workout.id, (a, b) => a < b);
    if (r) broken.push(r);
  }

  const r = await upsertBestRecord("longest_run", "En uzun kesintisiz koşu", workout.distanceM, "m", workout.date, workout.id, (a, b) => a > b);
  if (r) broken.push(r);

  return broken;
}

/** Kuvvet setleri kaydedildikten sonra hareket bazlı maks ağırlık/tekrar rekorlarını günceller. */
export async function checkStrengthRecords(workout: Workout, sets: StrengthSet[]): Promise<PersonalRecord[]> {
  const broken: PersonalRecord[] = [];
  const byExercise = new Map<string, StrengthSet[]>();
  for (const s of sets) {
    if (!byExercise.has(s.exerciseId)) byExercise.set(s.exerciseId, []);
    byExercise.get(s.exerciseId)!.push(s);
  }

  for (const [exerciseId, exSets] of byExercise) {
    const name = exSets[0].exerciseName;
    const maxWeight = Math.max(...exSets.map((s) => s.weightKg ?? 0));
    if (maxWeight > 0) {
      const r = await upsertBestRecord(`exercise:${exerciseId}:max_weight`, `${name} — maks ağırlık`, maxWeight, "kg", workout.date, workout.id, (a, b) => a > b);
      if (r) broken.push(r);
    }
    const maxReps = Math.max(...exSets.map((s) => s.reps ?? 0));
    if (maxReps > 0) {
      const r = await upsertBestRecord(`exercise:${exerciseId}:max_reps`, `${name} — maks tekrar`, maxReps, "tekrar", workout.date, workout.id, (a, b) => a > b);
      if (r) broken.push(r);
    }
  }

  return broken;
}

export async function getAllPersonalRecords(): Promise<PersonalRecord[]> {
  return db.personalRecords.toArray();
}
