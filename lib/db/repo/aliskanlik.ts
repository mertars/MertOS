import { db } from "@/lib/db/schema";
import type { Habit, HabitFrequency, LongTermGoal } from "@/lib/db/types";
import { uid } from "@/lib/utils";
import { dateKey } from "./workouts";

// --- Alışkanlıklar ---

export async function addHabit(name: string, colorVar: string, frequency: HabitFrequency): Promise<string> {
  const id = uid();
  const habit: Habit = { id, name, colorVar, frequency, createdAt: new Date().toISOString() };
  await db.habits.add(habit);
  return id;
}

export async function archiveHabit(id: string) {
  await db.habits.update(id, { archivedAt: new Date().toISOString() });
}

export async function getActiveHabits(): Promise<Habit[]> {
  const rows = await db.habits.toArray();
  return rows.filter((h) => !h.archivedAt);
}

export async function toggleHabitLog(habitId: string, date: Date, done: boolean) {
  const key = `${habitId}__${dateKey(date)}`;
  await db.habitLogs.put({ id: key, habitId, date: dateKey(date), done });
}

export async function getHabitLogsInRange(habitId: string, start: Date, end: Date) {
  const rows = await db.habitLogs.where("habitId").equals(habitId).toArray();
  return rows.filter((r) => r.date >= dateKey(start) && r.date <= dateKey(end) && r.done);
}

export async function getAllHabitLogsForDate(date: Date = new Date()) {
  const rows = await db.habitLogs.where("date").equals(dateKey(date)).toArray();
  return rows.filter((r) => r.done);
}

/** Bir alışkanlığın bugünkü ardışık seri (streak) uzunluğunu hesaplar. */
export async function getHabitStreak(habitId: string): Promise<number> {
  const rows = await db.habitLogs.where("habitId").equals(habitId).toArray();
  const doneDates = new Set(rows.filter((r) => r.done).map((r) => r.date));
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    if (doneDates.has(dateKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

// --- Uzun Vadeli Hedefler ---

export async function addLongTermGoal(input: Omit<LongTermGoal, "id" | "createdAt" | "milestones"> & { milestones: string[] }): Promise<string> {
  const id = uid();
  const goal: LongTermGoal = {
    id,
    title: input.title,
    description: input.description,
    targetDate: input.targetDate,
    linkedMetric: input.linkedMetric,
    linkedMetricTargetValue: input.linkedMetricTargetValue,
    manualProgressPercent: input.manualProgressPercent,
    milestones: input.milestones.filter(Boolean).map((label) => ({ id: uid(), label, done: false })),
    createdAt: new Date().toISOString(),
  };
  await db.longTermGoals.add(goal);
  return id;
}

export async function toggleMilestone(goalId: string, milestoneId: string, done: boolean) {
  const goal = await db.longTermGoals.get(goalId);
  if (!goal) return;
  const milestones = goal.milestones.map((m) => (m.id === milestoneId ? { ...m, done, doneAt: done ? new Date().toISOString() : undefined } : m));
  await db.longTermGoals.update(goalId, { milestones });
}

export async function getAllLongTermGoals(): Promise<LongTermGoal[]> {
  return db.longTermGoals.toArray();
}

export async function deleteLongTermGoal(id: string) {
  await db.longTermGoals.delete(id);
}
