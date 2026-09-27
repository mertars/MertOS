import type { CigaretteSettings } from "@/lib/db/types";
import { clamp } from "@/lib/utils";

/**
 * MertOS Skoru — çekirdek motor (saf fonksiyonlar, Dexie'den bağımsız).
 *
 * 1. Aşama: halkalar Hareket, Yakıt (şimdilik sadece su) ve Temiz (sigara) ile
 * çalışır. Zihin halkası 2. aşamada (uyku + ruh hali + odak verisi gelince)
 * eklenecek — bu yüzden ağırlıklar Zihin dahil tanımlı ama toplam skor,
 * henüz veri üretmeyen halkalar HARİÇ TUTULARAK yeniden normalize edilir.
 * Böylece 2. aşamada Zihin halkası eklendiğinde sadece `available` listesine
 * "zihin" eklemek yeterli olacak, formül değişmeyecek.
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

export function computeHareketRing(opts: { trainedToday: boolean; completedThisWeek: number; plannedThisWeek: number }): number {
  if (opts.trainedToday) return 100;
  if (opts.plannedThisWeek <= 0) return 60; // program yoksa nötr bir taban
  return clamp(Math.round((opts.completedThisWeek / opts.plannedThisWeek) * 90), 0, 90);
}

// --- Toplam ---------------------------------------------------------------

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = { hareket: 0.4, yakit: 0.2, temiz: 0.25, zihin: 0.15 };

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
