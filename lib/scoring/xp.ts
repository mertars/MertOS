/**
 * Sade bir seviye/XP göstergesi (abartılı oyunlaştırma yok — bkz. görev tanımı § 7).
 * XP, geçmiş günlerin MertOS Skoru'ndan türetilir (iyi bir gün = XP), ayrı bir
 * event-tabanlı XP defteri tutulmaz; bu yüzden tamamen saf/deterministik ve
 * geriye dönük olarak yeniden hesaplanabilir.
 */

export function xpForDay(score: number): number {
  if (score >= 85) return 20;
  if (score >= 60) return 10;
  return 0;
}

/** Seviye L'ye ulaşmak için gereken KÜMÜLATİF XP (üçgensel sayı ile ölçeklenmiş — her seviye biraz daha zor). */
export function cumulativeXpForLevel(level: number): number {
  return 50 * level * (level + 1);
}

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
}

export function computeLevel(totalXp: number): LevelInfo {
  let level = 0;
  while (cumulativeXpForLevel(level + 1) <= totalXp) level++;
  const currentFloor = cumulativeXpForLevel(level);
  const nextCeil = cumulativeXpForLevel(level + 1);
  const xpIntoLevel = totalXp - currentFloor;
  const xpNeededForNextLevel = nextCeil - currentFloor;
  return {
    level,
    xpIntoLevel,
    xpNeededForNextLevel,
    progressPercent: Math.round((xpIntoLevel / xpNeededForNextLevel) * 100),
  };
}
