import { setHours, setMinutes } from "date-fns";
import { PROGRAM_SESSION_HOUR } from "@/lib/programs/kondisyon-8-hafta";

export const TARGET_SLEEP_MIN = 480; // 8 saat

/** Son N gecenin uyku borcunu (8 saatin altında kalan toplam dakika) hesaplar. */
export function computeSleepDebtMin(entries: { durationMin: number }[], targetMin = TARGET_SLEEP_MIN): number {
  return entries.reduce((debt, e) => debt + Math.max(0, targetMin - e.durationMin), 0);
}

/** Sabah antrenmanı için ideal yatış saatini önerir (hedef kalkış saatinden 8 saat geri). */
export function computeIdealBedtime(wakeDate: Date, targetSleepMin = TARGET_SLEEP_MIN): Date {
  const wake = setMinutes(setHours(wakeDate, PROGRAM_SESSION_HOUR.start), 0);
  return new Date(wake.getTime() - targetSleepMin * 60_000);
}
