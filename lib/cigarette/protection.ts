import type { Workout } from "@/lib/db/types";

/**
 * "Antrenman koruması": antrenmandan önceki/sonraki `windowMin` dakikalık
 * pencerede olup olmadığımızı hesaplar. Bu pencerede sigara eklenirse
 * arayüzde nazik bir uyarı gösterilir (bkz. görev tanımı § 6.5).
 */
export function isWithinTrainingProtectionWindow(now: Date, todaysWorkouts: Workout[], windowMin: number): boolean {
  const windowMs = windowMin * 60_000;
  return todaysWorkouts.some((w) => {
    const start = new Date(w.startedAt).getTime();
    const end = w.endedAt ? new Date(w.endedAt).getTime() : start + w.durationSec * 1000;
    return now.getTime() >= start - windowMs && now.getTime() <= end + windowMs;
  });
}
