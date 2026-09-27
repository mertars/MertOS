import { format } from "date-fns";
import { db } from "@/lib/db/schema";
import type { StrengthSet, Workout } from "@/lib/db/types";
import { uid } from "@/lib/utils";

export function dateKey(date: Date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

export async function addWorkout(input: Omit<Workout, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const id = uid();
  const now = new Date().toISOString();
  const workout: Workout = { ...input, id, createdAt: now, updatedAt: now };
  await db.workouts.add(workout);
  return id;
}

export async function updateWorkout(id: string, patch: Partial<Workout>) {
  await db.workouts.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function softDeleteWorkout(id: string) {
  await db.workouts.update(id, { deletedAt: new Date().toISOString() });
}

export async function restoreWorkout(id: string) {
  await db.workouts.update(id, { deletedAt: null });
}

export async function getWorkout(id: string) {
  return db.workouts.get(id);
}

export async function getWorkoutsForDate(date: Date = new Date()): Promise<Workout[]> {
  const key = dateKey(date);
  const rows = await db.workouts.where("date").equals(key).toArray();
  return rows.filter((w) => !w.deletedAt).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export async function getWorkoutsInRange(startDate: Date, endDate: Date): Promise<Workout[]> {
  const rows = await db.workouts.where("date").between(dateKey(startDate), dateKey(endDate), true, true).toArray();
  return rows.filter((w) => !w.deletedAt).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getAllWorkouts(): Promise<Workout[]> {
  const rows = await db.workouts.toArray();
  return rows.filter((w) => !w.deletedAt).sort((a, b) => b.date.localeCompare(a.date));
}

export async function addStrengthSets(sets: Omit<StrengthSet, "id" | "createdAt">[]) {
  const now = new Date().toISOString();
  const rows: StrengthSet[] = sets.map((s) => ({ ...s, id: uid(), createdAt: now }));
  await db.strengthSets.bulkAdd(rows);
  return rows;
}

export async function getStrengthSetsForWorkout(workoutId: string) {
  return db.strengthSets.where("workoutId").equals(workoutId).toArray();
}

export async function deleteStrengthSetsForWorkout(workoutId: string) {
  const rows = await getStrengthSetsForWorkout(workoutId);
  await db.strengthSets.bulkDelete(rows.map((r) => r.id));
}
