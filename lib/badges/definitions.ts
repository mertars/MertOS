import { db } from "@/lib/db/schema";
import { getCigaretteSettings, getProfile } from "@/lib/db";
import { getAllPersonalRecords } from "@/lib/programs/records";
import { getActiveHabits, getHabitStreak } from "@/lib/db/repo/aliskanlik";
import { getCigaretteEntriesForDay } from "@/lib/db/repo/cigarette";
import { getWaterTotalForDay } from "@/lib/db/repo/water";
import { getWorkoutsForDate } from "@/lib/db/repo/workouts";
import { computeCigaretteLimit, computeWaterGoalMl } from "@/lib/scoring/engine";

export interface BadgeDefinition {
  id: string;
  label: string;
  description: string;
  accentVar: string;
  check: () => Promise<boolean>;
}

async function anyWorkout(): Promise<boolean> {
  return (await db.workouts.count()) > 0;
}

async function has5kOrLonger(): Promise<boolean> {
  const records = await getAllPersonalRecords();
  const longest = records.find((r) => r.category === "longest_run");
  const run5k = records.find((r) => r.category === "run_5k");
  return Boolean(run5k) || (longest != null && longest.value >= 5000);
}

async function cleanStreakAtLeast(days: number): Promise<boolean> {
  const settings = await getCigaretteSettings();
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const count = (await getCigaretteEntriesForDay(d)).length;
    const limit = computeCigaretteLimit(settings, d);
    const ok = settings.quitMode ? count === 0 : count <= limit;
    if (!ok) return false;
  }
  return true;
}

async function waterStreakAtLeast(days: number): Promise<boolean> {
  const profile = await getProfile();
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const trained = (await getWorkoutsForDate(d)).length > 0;
    const goal = computeWaterGoalMl(profile.weightKg, trained);
    const ml = await getWaterTotalForDay(d);
    if (ml < goal) return false;
  }
  return true;
}

async function firstWeekOfProgramDone(): Promise<boolean> {
  const programs = await db.programs.toArray();
  const active = programs.find((p) => p.isActive);
  if (!active) return false;
  const week1Days = active.weeks.find((w) => w.weekNumber === 1)?.days.length ?? 0;
  if (week1Days === 0) return false;
  const workouts = await db.workouts.toArray();
  const completed = new Set(workouts.filter((w) => w.programId === active.id && w.programWeek === 1 && !w.deletedAt).map((w) => w.programDayId));
  return completed.size >= week1Days;
}

async function anyCompletedTask(): Promise<boolean> {
  const tasks = await db.tasks.toArray();
  return tasks.some((t) => t.done && !t.deletedAt);
}

async function habitStreakAtLeast(days: number): Promise<boolean> {
  const habits = await getActiveHabits();
  for (const h of habits) {
    if ((await getHabitStreak(h.id)) >= days) return true;
  }
  return false;
}

async function anyCompletedFocusSession(): Promise<boolean> {
  const rows = await db.focusSessions.toArray();
  return rows.some((r) => r.completed);
}

async function anyMeal(): Promise<boolean> {
  const rows = await db.mealEntries.toArray();
  return rows.some((r) => !r.deletedAt);
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: "ilk-antrenman", label: "İlk Antrenman", description: "İlk antrenmanını kaydettin.", accentVar: "--color-hareket", check: anyWorkout },
  { id: "ilk-5km", label: "İlk 5K", description: "Kesintisiz 5 km koştun.", accentVar: "--color-hareket", check: has5kOrLonger },
  { id: "temiz-7", label: "7 Gün Temiz", description: "7 gün üst üste limit altında ya da sigarasız kaldın.", accentVar: "--color-sigara-temiz", check: () => cleanStreakAtLeast(7) },
  { id: "temiz-30", label: "30 Gün Temiz", description: "30 gün üst üste limit altında ya da sigarasız kaldın.", accentVar: "--color-sigara-temiz", check: () => cleanStreakAtLeast(30) },
  { id: "su-30", label: "30 Gün Su Hedefi", description: "30 gün üst üste su hedefini tutturdun.", accentVar: "--color-su", check: () => waterStreakAtLeast(30) },
  { id: "ilk-hafta-program", label: "İlk Hafta Tamam", description: "Kondisyon programının ilk haftasını bitirdin.", accentVar: "--color-hareket", check: firstWeekOfProgramDone },
  { id: "ilk-gorev", label: "İlk Görev", description: "İlk görevini tamamladın.", accentVar: "--color-uretkenlik", check: anyCompletedTask },
  { id: "aliskanlik-7", label: "7 Gün Alışkanlık", description: "Bir alışkanlığı 7 gün üst üste sürdürdün.", accentVar: "--color-uyku", check: () => habitStreakAtLeast(7) },
  { id: "ilk-odak", label: "İlk Odak", description: "İlk odak oturumunu tamamladın.", accentVar: "--color-uretkenlik", check: anyCompletedFocusSession },
  { id: "ilk-ogun", label: "İlk Öğün", description: "İlk öğününü kaydettin.", accentVar: "--color-beslenme", check: anyMeal },
];
