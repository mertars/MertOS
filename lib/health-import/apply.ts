import { addWorkout, getAllWorkouts } from "@/lib/db/repo/workouts";
import { addBodyMetric, addHeartMetric, addSleepEntry, logHealthImportBatch, upsertActivityDaily } from "@/lib/db/repo/health";
import { checkRunningRecords } from "@/lib/programs/records";
import { getWorkout } from "@/lib/db/repo/workouts";
import type { HealthImportPayload, ImportedWorkout } from "./schema";

const DUPLICATE_TIME_TOLERANCE_MS = 5 * 60_000;
const DUPLICATE_DURATION_TOLERANCE_PCT = 0.1;

export interface ImportPreviewItem extends ImportedWorkout {
  isDuplicate: boolean;
}

export interface ImportPreview {
  workouts: ImportPreviewItem[];
  newWorkoutCount: number;
  duplicateWorkoutCount: number;
  steps?: number;
  activeEnergyKcal?: number;
  restingHr?: number;
  hrv?: number;
  vo2max?: number;
  weightKg?: number;
  hasSleep: boolean;
  summaryText: string;
}

export async function buildImportPreview(payload: HealthImportPayload): Promise<ImportPreview> {
  const existing = await getAllWorkouts();

  const workouts: ImportPreviewItem[] = payload.workouts.map((w) => {
    const startMs = new Date(w.startedAt).getTime();
    const isDuplicate = existing.some((e) => {
      const existingStartMs = new Date(e.startedAt).getTime();
      const timeClose = Math.abs(existingStartMs - startMs) <= DUPLICATE_TIME_TOLERANCE_MS;
      const durationClose = Math.abs(e.durationSec - w.durationSec) / w.durationSec <= DUPLICATE_DURATION_TOLERANCE_PCT;
      return timeClose && durationClose;
    });
    return { ...w, isDuplicate };
  });

  const newWorkoutCount = workouts.filter((w) => !w.isDuplicate).length;
  const duplicateWorkoutCount = workouts.length - newWorkoutCount;

  const parts: string[] = [];
  if (newWorkoutCount > 0) parts.push(`${newWorkoutCount} antrenman`);
  if (payload.steps) parts.push(`${payload.steps.toLocaleString("tr-TR")} adım`);
  if (payload.sleep?.durationMin) {
    const h = Math.floor(payload.sleep.durationMin / 60);
    const m = payload.sleep.durationMin % 60;
    parts.push(`${h} sa ${m} dk uyku`);
  }
  if (payload.restingHr) parts.push(`dinlenik nabız ${payload.restingHr}`);
  if (payload.weightKg) parts.push(`kilo ${payload.weightKg} kg`);

  return {
    workouts,
    newWorkoutCount,
    duplicateWorkoutCount,
    steps: payload.steps,
    activeEnergyKcal: payload.activeEnergyKcal,
    restingHr: payload.restingHr,
    hrv: payload.hrv,
    vo2max: payload.vo2max,
    weightKg: payload.weightKg,
    hasSleep: Boolean(payload.sleep),
    summaryText: parts.length > 0 ? parts.join(", ") + " bulundu" : "Yeni veri bulunamadı",
  };
}

export async function applyHealthImport(payload: HealthImportPayload, preview: ImportPreview): Promise<void> {
  const now = new Date();

  for (const w of preview.workouts) {
    if (w.isDuplicate) continue;
    const startedAt = new Date(w.startedAt);
    const workoutId = await addWorkout({
      type: w.type,
      date: startedAt.toISOString().slice(0, 10),
      startedAt: w.startedAt,
      endedAt: new Date(startedAt.getTime() + w.durationSec * 1000).toISOString(),
      durationSec: w.durationSec,
      distanceM: w.distanceM,
      avgHr: w.avgHr,
      maxHr: w.maxHr,
      vo2max: w.vo2max,
      source: "manuel",
    });
    if (w.distanceM) {
      const saved = await getWorkout(workoutId);
      if (saved) await checkRunningRecords(saved);
    }
  }

  if (payload.steps != null || payload.activeEnergyKcal != null) {
    await upsertActivityDaily(now, { steps: payload.steps, activeEnergyKcal: payload.activeEnergyKcal }, "apple-health");
  }

  if (payload.restingHr != null || payload.hrv != null || payload.vo2max != null) {
    await addHeartMetric({
      date: now.toISOString().slice(0, 10),
      restingHr: payload.restingHr,
      hrv: payload.hrv,
      vo2max: payload.vo2max,
      source: "apple-health",
    });
  }

  if (payload.weightKg != null) {
    await addBodyMetric({ date: now.toISOString().slice(0, 10), weightKg: payload.weightKg, source: "apple-health" });
  }

  if (payload.sleep) {
    const wakeDate = new Date(payload.sleep.wakeTime);
    const durationMin =
      payload.sleep.durationMin ?? Math.round((wakeDate.getTime() - new Date(payload.sleep.bedTime).getTime()) / 60000);
    await addSleepEntry({
      date: wakeDate.toISOString().slice(0, 10),
      bedTime: payload.sleep.bedTime,
      wakeTime: payload.sleep.wakeTime,
      durationMin,
      quality: payload.sleep.quality as 1 | 2 | 3 | 4 | 5 | undefined,
      phases: {
        deepMin: payload.sleep.deepMin,
        remMin: payload.sleep.remMin,
        lightMin: payload.sleep.lightMin,
        awakeMin: payload.sleep.awakeMin,
      },
      source: "apple-health",
    });
  }

  await logHealthImportBatch({ importedAt: now.toISOString(), sourceKind: payload.source, summary: preview.summaryText });
}
