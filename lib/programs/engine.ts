import { differenceInCalendarWeeks, getDay, getISODay } from "date-fns";
import type { Program, ProgramDay, ProgramProgress, Workout } from "@/lib/db/types";
import { PROGRAM_SCHEDULE } from "./kondisyon-8-hafta";
import { clamp } from "@/lib/utils";

/** Program başlangıcından bu yana geçen hafta sayısına göre "şu anki hafta"yı hesaplar (1 tabanlı, sona sabitlenir). */
export function getCurrentWeekNumber(program: Program, progress: ProgramProgress | undefined, today = new Date()): number {
  if (!progress) return 1;
  const elapsed = differenceInCalendarWeeks(today, new Date(progress.startedAt), { weekStartsOn: 1 });
  return clamp(elapsed + 1, 1, program.weeks.length);
}

const DAY_INDEX: Record<"a" | "b" | "c", number> = { a: 0, b: 1, c: 2 };

/** Bugün programa göre planlanmış bir antrenman günü var mı? Varsa döndürür. */
export function getScheduledDayForDate(program: Program, progress: ProgramProgress | undefined, date = new Date()): { day: ProgramDay; weekNumber: number } | null {
  const key = PROGRAM_SCHEDULE[getDay(date)];
  if (!key) return null;
  const weekNumber = getCurrentWeekNumber(program, progress, date);
  const week = program.weeks.find((w) => w.weekNumber === weekNumber);
  if (!week) return null;
  const day = week.days[DAY_INDEX[key]];
  return day ? { day, weekNumber } : null;
}

export function isDeloadWeek(program: Program, weekNumber: number) {
  return program.weeks.find((w) => w.weekNumber === weekNumber)?.isDeload ?? false;
}

/** Haftalık koşu süresi artışını %maxPct ile sınırlar (deload sonrası eski tepe seviyesine dönüşe izin verir). */
export function capWeeklyRunIncrease(prevMinutes: number, proposedMinutes: number, prevWasDeload: boolean, maxPct = 0.1) {
  if (prevWasDeload || proposedMinutes <= prevMinutes) return proposedMinutes;
  const maxAllowed = prevMinutes * (1 + maxPct);
  return Math.round(Math.min(proposedMinutes, maxAllowed));
}

export interface RpeAdjustment {
  deltaRounds: number;
  note: string;
}

/**
 * Son oturumların RPE/his ortalamasına göre interval tekrarını otomatik ayarlar.
 * RPE ortalaması yüksekse (çok zor) artışı durdurur/azaltır; düşükse (kolay) hafif artırır.
 */
export function suggestIntervalAdjustment(recentFeelAvg: number | null): RpeAdjustment {
  if (recentFeelAvg == null) return { deltaRounds: 0, note: "Yeterli geçmiş veri yok, plana göre devam." };
  if (recentFeelAvg >= 4.5) return { deltaRounds: -1, note: "Son oturumlar çok zor geçti — bu hafta bir tur azalt." };
  if (recentFeelAvg >= 4) return { deltaRounds: 0, note: "Zorlayıcı ama kontrollü — plana göre devam." };
  if (recentFeelAvg <= 2) return { deltaRounds: 1, note: "Son oturumlar rahat geçti — bir tur ekleyebilirsin." };
  return { deltaRounds: 0, note: "İyi gidiyor, plana göre devam." };
}

export function averageFeel(workouts: Workout[]): number | null {
  const withFeel = workouts.filter((w) => typeof w.feel === "number");
  if (withFeel.length === 0) return null;
  return withFeel.reduce((sum, w) => sum + (w.feel ?? 0), 0) / withFeel.length;
}

const SCHEDULE_ISO_DAYS = [2, 4, 6]; // Salı, Perşembe, Cumartesi

/** Bu haftanın başından (Pazartesi) bugüne kadar KAÇ antrenman günü planlanmış (bugün dahil). */
export function getPlannedSessionsThisWeekSoFar(date: Date): number {
  const iso = getISODay(date);
  return SCHEDULE_ISO_DAYS.filter((d) => d <= iso).length;
}

/** Haftalık ilerleme tablosu için: her hafta hedef vs tamamlanan gün sayısı. */
export function getWeekProgressSummary(program: Program, weekNumber: number, workoutsInWeek: Workout[]) {
  const week = program.weeks.find((w) => w.weekNumber === weekNumber);
  const plannedDays = week?.days.length ?? 0;
  const completedDays = new Set(workoutsInWeek.filter((w) => w.programWeek === weekNumber).map((w) => w.programDayId)).size;
  return { plannedDays, completedDays, percent: plannedDays ? Math.round((completedDays / plannedDays) * 100) : 0 };
}
