import { db } from "@/lib/db/schema";
import type { FocusSession, Project, Task, TaskBucket, TaskPriority } from "@/lib/db/types";
import { uid } from "@/lib/utils";
import { dateKey } from "./workouts";

// --- Görevler ---

export async function addTask(input: { title: string; bucket: TaskBucket; priority: TaskPriority; projectId?: string; dueDate?: string }): Promise<string> {
  const id = uid();
  const task: Task = { id, title: input.title, done: false, priority: input.priority, bucket: input.bucket, projectId: input.projectId, dueDate: input.dueDate, createdAt: new Date().toISOString() };
  await db.tasks.add(task);
  return id;
}

export async function toggleTaskDone(id: string, done: boolean) {
  await db.tasks.update(id, { done, completedAt: done ? new Date().toISOString() : undefined });
}

export async function softDeleteTask(id: string) {
  await db.tasks.update(id, { deletedAt: new Date().toISOString() });
}

export async function restoreTask(id: string) {
  await db.tasks.update(id, { deletedAt: null });
}

export async function getTasksByBucket(bucket: TaskBucket): Promise<Task[]> {
  const rows = await db.tasks.where("bucket").equals(bucket).toArray();
  return rows.filter((t) => !t.deletedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getAllOpenTasks(): Promise<Task[]> {
  const rows = await db.tasks.toArray();
  return rows.filter((t) => !t.deletedAt && !t.done);
}

export async function getCompletedTasksInRange(start: Date, end: Date): Promise<Task[]> {
  const rows = await db.tasks.toArray();
  return rows.filter((t) => !t.deletedAt && t.done && t.completedAt && t.completedAt >= start.toISOString() && t.completedAt <= end.toISOString());
}

// --- Projeler ---

export async function addProject(input: { name: string; colorVar: string; note?: string }): Promise<string> {
  const id = uid();
  const project: Project = { id, name: input.name, colorVar: input.colorVar, note: input.note, createdAt: new Date().toISOString() };
  await db.projects.add(project);
  return id;
}

export async function archiveProject(id: string) {
  await db.projects.update(id, { archivedAt: new Date().toISOString() });
}

export async function getActiveProjects(): Promise<Project[]> {
  const rows = await db.projects.toArray();
  return rows.filter((p) => !p.archivedAt);
}

export async function getOpenTaskCountByProject(): Promise<Record<string, number>> {
  const tasks = await getAllOpenTasks();
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    if (!t.projectId) continue;
    counts[t.projectId] = (counts[t.projectId] ?? 0) + 1;
  }
  return counts;
}

// --- Odak (pomodoro) ---

export async function addFocusSession(input: { targetDurationSec: number; actualDurationSec: number; completed: boolean; projectId?: string; taskId?: string; startedAt: string }): Promise<string> {
  const id = uid();
  const session: FocusSession = {
    id,
    startedAt: input.startedAt,
    endedAt: new Date().toISOString(),
    targetDurationSec: input.targetDurationSec,
    actualDurationSec: input.actualDurationSec,
    projectId: input.projectId,
    taskId: input.taskId,
    completed: input.completed,
    createdAt: new Date().toISOString(),
  };
  await db.focusSessions.add(session);
  return id;
}

export async function getFocusSessionsForToday(): Promise<FocusSession[]> {
  const key = dateKey();
  const all = await db.focusSessions.toArray();
  return all.filter((s) => s.startedAt.slice(0, 10) === key);
}

export async function getFocusSessionsInRange(start: Date, end: Date): Promise<FocusSession[]> {
  const all = await db.focusSessions.toArray();
  return all.filter((s) => s.startedAt >= start.toISOString() && s.startedAt <= end.toISOString());
}
