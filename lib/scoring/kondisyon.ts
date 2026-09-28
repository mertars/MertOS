import type { Workout } from "@/lib/db/types";
import { clamp } from "@/lib/utils";

/**
 * Kondisyon Skoru (0-100) — Antrenman & Kondisyon modülüne özel, MertOS Skoru'ndan
 * bağımsız bir metrik. Girdiler: pace gelişimi, VO2max, haftalık hacim ve
 * (2. aşamada Kalp modülü ile eklenen) dinlenik nabız TRENDİ.
 *
 * Dinlenik nabız mutlak bir eşiğe göre değil, kişinin kendi geçmişine göre
 * (son 7 gün vs önceki 7 gün) puanlanır — böylece herkesin kendi başlangıç
 * seviyesi baz alınır, popülasyon normu varsayılmaz.
 *
 * Başlangıç referansı: 10 km ~88 dk, koşu ~7 dk/km, yürüyüş ~9 dk/km.
 */

const BASELINE_PACE_MIN_PER_KM = 7.0;
const WEIGHTS = { pace: 0.35, vo2max: 0.2, hacim: 0.25, restingHr: 0.2 } as const;

export interface KondisyonInputs {
  /** Son ~30 gündeki koşu antrenmanları (silinmemiş). */
  recentRuns: Workout[];
  /** Son 60 gün içindeki en güncel VO2max (varsa). */
  latestVo2max: number | null;
  /** Bu haftaki toplam antrenman süresi (dk). */
  weeklyVolumeMin: number;
  /** Hedef haftalık hacim (dk) — genelde aktif programın o haftaki toplam süresi. */
  targetWeeklyVolumeMin: number;
  /** Son 7 günün ortalama dinlenik nabzı (varsa). */
  recentRestingHrAvg?: number | null;
  /** Önceki 7 günün ortalama dinlenik nabzı — trend karşılaştırması için (varsa). */
  previousRestingHrAvg?: number | null;
}

export interface KondisyonResult {
  score: number;
  paceScore: number | null;
  vo2maxScore: number | null;
  hacimScore: number;
  restingHrScore: number | null;
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

/** Nötr (50) etrafında, her 1 bpm'lik düşüş (iyileşme) +3 puan katkı yapar. */
export function computeRestingHrTrendScore(recentAvg: number | null | undefined, previousAvg: number | null | undefined): number | null {
  if (recentAvg == null || previousAvg == null) return null;
  return clamp(Math.round(50 + (previousAvg - recentAvg) * 3), 0, 100);
}

export function computeKondisyonSkoru(inputs: KondisyonInputs): KondisyonResult {
  const avgPace = computeAvgPaceMinPerKm(inputs.recentRuns);
  const paceScore = computePaceScore(avgPace);
  const vo2maxScore = computeVo2maxScore(inputs.latestVo2max);
  const hacimScore = computeHacimScore(inputs.weeklyVolumeMin, inputs.targetWeeklyVolumeMin);
  const restingHrScore = computeRestingHrTrendScore(inputs.recentRestingHrAvg, inputs.previousRestingHrAvg);

  const parts: { score: number; weight: number }[] = [{ score: hacimScore, weight: WEIGHTS.hacim }];
  if (paceScore != null) parts.push({ score: paceScore, weight: WEIGHTS.pace });
  if (vo2maxScore != null) parts.push({ score: vo2maxScore, weight: WEIGHTS.vo2max });
  if (restingHrScore != null) parts.push({ score: restingHrScore, weight: WEIGHTS.restingHr });

  const weightSum = parts.reduce((s, p) => s + p.weight, 0) || 1;
  const score = Math.round(parts.reduce((s, p) => s + p.score * p.weight, 0) / weightSum);

  return { score: clamp(score, 0, 100), paceScore, vo2maxScore, hacimScore, restingHrScore, avgPaceMinPerKm: avgPace };
}
