import type { CigaretteSettings } from "@/lib/db/types";
import { clamp } from "@/lib/utils";

/**
 * MertOS Skoru — çekirdek motor (saf fonksiyonlar, Dexie'den bağımsız).
 *
 * Tam sürüm (2. aşama): Hareket / Yakıt (su + beslenme) / Temiz / Zihin
 * (uyku + ruh hali + odak) halkalarının hepsi dolu. Bir gün için bazı
 * halkaların girdisi yoksa (örn. o gün hiç uyku kaydı yok) o halka `null`
 * kalır ve toplam skor, mevcut halkaların ağırlıkları yeniden normalize
 * edilerek hesaplanır — böylece eksik veri günleri haksız yere düşük skor
 * almaz.
 */

export type RingKey = "hareket" | "yakit" | "temiz" | "zihin";

export interface ScoreWeights {
  hareket: number;
  yakit: number;
  temiz: number;
  zihin: number;
}

export interface RingValues {
  hareket: number | null;
  yakit: number | null;
  temiz: number | null;
  zihin: number | null;
}

export interface DailyScoreResult {
  rings: RingValues;
  total: number;
  availableRings: RingKey[];
}

// --- Yakıt (Su) -------------------------------------------------------

export function computeWaterGoalMl(weightKg: number | undefined, isTrainingDay: boolean): number {
  const base = (weightKg ?? 75) * 35;
  return Math.round(base + (isTrainingDay ? 500 : 0));
}

export function computeYakitRing(waterMlToday: number, goalMl: number): number {
  if (goalMl <= 0) return 0;
  return clamp(Math.round((waterMlToday / goalMl) * 100), 0, 100);
}

// --- Temiz (Sigara) -----------------------------------------------------

export function computeCigaretteLimit(settings: Pick<CigaretteSettings, "quitMode" | "reduction" | "baselineAvgPerDay">, date: Date): number {
  if (settings.quitMode) return 0;
  const plan = settings.reduction;
  if (!plan) return settings.baselineAvgPerDay;
  const start = new Date(plan.startDate).getTime();
  const end = new Date(plan.targetDate).getTime();
  const now = date.getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return settings.baselineAvgPerDay;
  if (now <= start) return plan.startAvgPerDay;
  if (now >= end) return plan.targetAvgPerDay;
  const t = (now - start) / (end - start);
  return Math.round(plan.startAvgPerDay + (plan.targetAvgPerDay - plan.startAvgPerDay) * t);
}

export function computeTemizRing(cigCountToday: number, limit: number, quitMode: boolean): number {
  if (quitMode) return cigCountToday === 0 ? 100 : clamp(100 - cigCountToday * 34, 0, 100);
  if (limit <= 0) return cigCountToday === 0 ? 100 : 0;
  return clamp(Math.round((1 - cigCountToday / limit) * 100), 0, 100);
}

// --- Hareket (Antrenman) -------------------------------------------------

const STEP_GOAL = 8000;

export function computeStepsRing(steps: number | null | undefined): number {
  if (!steps) return 0;
  return clamp(Math.round((steps / STEP_GOAL) * 100), 0, 100);
}

/**
 * Antrenman tabanlı (haftalık planla karşılaştırma) VE adım tabanlı (varsa) ilerlemenin
 * daha iyisini alır — Aktivite modülü (2. aşama) adım verisi sağladığında ring'i
 * antrenman yapmadığın günlerde de anlamlı kılar (Apple Fitness "move ring" mantığı).
 */
export function computeHareketRing(opts: { trainedToday: boolean; completedThisWeek: number; plannedThisWeek: number; steps?: number | null }): number {
  if (opts.trainedToday) return 100;
  const stepsRing = computeStepsRing(opts.steps);
  const planRing = opts.plannedThisWeek <= 0 ? 60 : clamp(Math.round((opts.completedThisWeek / opts.plannedThisWeek) * 90), 0, 90);
  return Math.max(planRing, stepsRing);
}

// --- Zihin (Uyku + Ruh Hali + Odak) ---------------------------------------

const SLEEP_TARGET_MIN = 480;
const FOCUS_TARGET_MIN = 60;

export function computeSleepRing(durationMin: number | null | undefined): number | null {
  if (durationMin == null) return null;
  return clamp(Math.round((durationMin / SLEEP_TARGET_MIN) * 100), 0, 100);
}

/** mood/energy/stress her biri 1-5; stres tersine çevrilir (düşük stres iyi). */
export function computeMoodRing(avgMood: number | null, avgEnergy: number | null, avgStress: number | null): number | null {
  if (avgMood == null && avgEnergy == null && avgStress == null) return null;
  const parts = [avgMood, avgEnergy, avgStress != null ? 6 - avgStress : null].filter((v): v is number => v != null);
  if (parts.length === 0) return null;
  const avg = parts.reduce((s, v) => s + v, 0) / parts.length;
  return clamp(Math.round(((avg - 1) / 4) * 100), 0, 100);
}

export function computeFocusRing(totalFocusMin: number): number {
  return clamp(Math.round((totalFocusMin / FOCUS_TARGET_MIN) * 100), 0, 100);
}

const ZIHIN_WEIGHTS = { uyku: 0.4, ruhHali: 0.35, odak: 0.25 } as const;

export function computeZihinRing(inputs: { sleepRing: number | null; moodRing: number | null; focusRing: number | null }): number | null {
  const parts: { score: number; weight: number }[] = [];
  if (inputs.sleepRing != null) parts.push({ score: inputs.sleepRing, weight: ZIHIN_WEIGHTS.uyku });
  if (inputs.moodRing != null) parts.push({ score: inputs.moodRing, weight: ZIHIN_WEIGHTS.ruhHali });
  if (inputs.focusRing != null) parts.push({ score: inputs.focusRing, weight: ZIHIN_WEIGHTS.odak });
  if (parts.length === 0) return null;
  const weightSum = parts.reduce((s, p) => s + p.weight, 0);
  return clamp(Math.round(parts.reduce((s, p) => s + p.score * p.weight, 0) / weightSum), 0, 100);
}

// --- Toplam ---------------------------------------------------------------

/** Bkz. görev tanımı § 7 — Hareket %30, Yakıt %25, Temiz %25, Zihin %20. */
export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = { hareket: 0.3, yakit: 0.25, temiz: 0.25, zihin: 0.2 };

export function computeDailyScore(rings: RingValues, weights: ScoreWeights): DailyScoreResult {
  const available = (Object.keys(rings) as RingKey[]).filter((k) => rings[k] != null);
  const weightSum = available.reduce((s, k) => s + weights[k], 0) || 1;
  const total = available.reduce((s, k) => s + (rings[k] ?? 0) * weights[k], 0) / weightSum;
  return { rings, total: clamp(Math.round(total), 0, 100), availableRings: available };
}

/** Geriye doğru ardışık gün sayısını (skor >= eşik) hesaplar. `scores` en yeni gün SONDA olacak şekilde sıralı. */
export function computeStreak(scores: number[], threshold = 60): number {
  let streak = 0;
  for (let i = scores.length - 1; i >= 0; i--) {
    if (scores[i] >= threshold) streak++;
    else break;
  }
  return streak;
}
