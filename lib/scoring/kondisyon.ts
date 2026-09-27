import type { Workout } from "@/lib/db/types";
import { clamp } from "@/lib/utils";

/**
 * Kondisyon Skoru (0-100) — Antrenman & Kondisyon modülüne özel, MertOS Skoru'ndan
 * bağımsız bir metrik. Girdiler: pace gelişimi, VO2max ve haftalık hacim.
 *
 * "Dinlenik nabız trendi" 2. aşamadaki Kalp modülü ile eklenecek (bu alan için
 * henüz özel bir veri girişi yok); o güne kadar ağırlıklar mevcut girdiler
 * arasında yeniden normalize edilir — bkz. lib/scoring/engine.ts'teki aynı desen.
 *
 * Başlangıç referansı: 10 km ~88 dk, koşu ~7 dk/km, yürüyüş ~9 dk/km.
 */

const BASELINE_PACE_MIN_PER_KM = 7.0;
const WEIGHTS = { pace: 0.4, vo2max: 0.25, hacim: 0.35 } as const;

export interface KondisyonInputs {
  /** Son ~30 gündeki koşu antrenmanları (silinmemiş). */
  recentRuns: Workout[];
  /** Son 60 gün içindeki en güncel VO2max (varsa). */
  latestVo2max: number | null;
  /** Bu haftaki toplam antrenman süresi (dk). */
  weeklyVolumeMin: number;
  /** Hedef haftalık hacim (dk) — genelde aktif programın o haftaki toplam süresi. */
  targetWeeklyVolumeMin: number;
}

export interface KondisyonResult {
  score: number;
  paceScore: number | null;
  vo2maxScore: number | null;
  hacimScore: number;
  avgPaceMinPerKm: number | null;
}

export function computeAvgPaceMinPerKm(runs: Workout[]): number | null {
  const valid = runs.filter((w) => w.distanceM && w.distanceM > 0 && w.durationSec > 0);
  if (valid.length === 0) return null;
  const totalMin = valid.reduce((s, w) => s + w.durationSec / 60, 0);
  const totalKm = valid.reduce((s, w) => s + (w.distanceM ?? 0) / 1000, 0);
  return totalKm > 0 ? totalMin / totalKm : null;
}

export function computePaceScore(avgPaceMinPerKm: number | null): number | null {
  if (avgPaceMinPerKm == null) return null;
  return clamp(Math.round(50 + (BASELINE_PACE_MIN_PER_KM - avgPaceMinPerKm) * 20), 0, 100);
}

export function computeVo2maxScore(vo2max: number | null): number | null {
  if (vo2max == null) return null;
  return clamp(Math.round(((vo2max - 30) / (55 - 30)) * 100), 0, 100);
}

export function computeHacimScore(weeklyMin: number, targetMin: number): number {
  if (targetMin <= 0) return 60;
  return clamp(Math.round((weeklyMin / targetMin) * 100), 0, 100);
}

export function computeKondisyonSkoru(inputs: KondisyonInputs): KondisyonResult {
  const avgPace = computeAvgPaceMinPerKm(inputs.recentRuns);
  const paceScore = computePaceScore(avgPace);
  const vo2maxScore = computeVo2maxScore(inputs.latestVo2max);
  const hacimScore = computeHacimScore(inputs.weeklyVolumeMin, inputs.targetWeeklyVolumeMin);

  const parts: { score: number; weight: number }[] = [{ score: hacimScore, weight: WEIGHTS.hacim }];
  if (paceScore != null) parts.push({ score: paceScore, weight: WEIGHTS.pace });
  if (vo2maxScore != null) parts.push({ score: vo2maxScore, weight: WEIGHTS.vo2max });

  const weightSum = parts.reduce((s, p) => s + p.weight, 0) || 1;
  const score = Math.round(parts.reduce((s, p) => s + p.score * p.weight, 0) / weightSum);

  return { score: clamp(score, 0, 100), paceScore, vo2maxScore, hacimScore, avgPaceMinPerKm: avgPace };
}
