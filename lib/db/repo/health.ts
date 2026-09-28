import { db } from "@/lib/db/schema";
import type { ActivityDailyEntry, BodyMetricEntry, HeartMetricEntry, HealthImportBatch, HealthSource, SleepEntry } from "@/lib/db/types";
import { uid } from "@/lib/utils";
import { dateKey } from "./workouts";

// --- Aktivite (adım / aktif kalori) ---

export async function upsertActivityDaily(date: Date, patch: { steps?: number; activeEnergyKcal?: number }, source: HealthSource = "manuel") {
  const key = dateKey(date);
  const existing = await db.activityDaily.get(key);
  const row: ActivityDailyEntry = {
    id: key,
    date: key,
    steps: patch.steps ?? existing?.steps,
    activeEnergyKcal: patch.activeEnergyKcal ?? existing?.activeEnergyKcal,
    source,
    updatedAt: new Date().toISOString(),
  };
  await db.activityDaily.put(row);
}

export async function getActivityForDate(date: Date = new Date()): Promise<ActivityDailyEntry | undefined> {
  return db.activityDaily.get(dateKey(date));
}

export async function getActivityInRange(start: Date, end: Date): Promise<ActivityDailyEntry[]> {
  return db.activityDaily.where("date").between(dateKey(start), dateKey(end), true, true).toArray();
}

// --- Kalp ---

export async function addHeartMetric(input: Omit<HeartMetricEntry, "id" | "createdAt">): Promise<string> {
  const id = uid();
  await db.heartMetrics.add({ ...input, id, createdAt: new Date().toISOString() });
  return id;
}

export async function getLatestHeartMetric(): Promise<HeartMetricEntry | undefined> {
  const rows = await db.heartMetrics.orderBy("date").reverse().toArray();
  return rows[0];
}

export async function getHeartMetricsInRange(start: Date, end: Date): Promise<HeartMetricEntry[]> {
  return db.heartMetrics.where("date").between(dateKey(start), dateKey(end), true, true).toArray();
}

// --- Uyku ---

export async function addSleepEntry(input: Omit<SleepEntry, "id" | "createdAt">): Promise<string> {
  const id = uid();
  await db.sleepEntries.add({ ...input, id, createdAt: new Date().toISOString() });
  return id;
}

export async function softDeleteSleepEntry(id: string) {
  await db.sleepEntries.update(id, { deletedAt: new Date().toISOString() });
}

export async function restoreSleepEntry(id: string) {
  await db.sleepEntries.update(id, { deletedAt: null });
}

export async function getSleepEntryForDate(date: Date): Promise<SleepEntry | undefined> {
  const rows = await db.sleepEntries.where("date").equals(dateKey(date)).toArray();
  return rows.filter((r) => !r.deletedAt)[0];
}

export async function getSleepEntriesInRange(start: Date, end: Date): Promise<SleepEntry[]> {
  const rows = await db.sleepEntries.where("date").between(dateKey(start), dateKey(end), true, true).toArray();
  return rows.filter((r) => !r.deletedAt).sort((a, b) => a.date.localeCompare(b.date));
}

// --- Vücut ---

export async function addBodyMetric(input: Omit<BodyMetricEntry, "id" | "createdAt">): Promise<string> {
  const id = uid();
  await db.bodyMetrics.add({ ...input, id, createdAt: new Date().toISOString() });
  return id;
}

export async function softDeleteBodyMetric(id: string) {
  await db.bodyMetrics.update(id, { deletedAt: new Date().toISOString() });
}

export async function restoreBodyMetric(id: string) {
  await db.bodyMetrics.update(id, { deletedAt: null });
}

export async function getBodyMetricsInRange(start: Date, end: Date): Promise<BodyMetricEntry[]> {
  const rows = await db.bodyMetrics.where("date").between(dateKey(start), dateKey(end), true, true).toArray();
  return rows.filter((r) => !r.deletedAt).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getLatestBodyMetric(): Promise<BodyMetricEntry | undefined> {
  const rows = await db.bodyMetrics.orderBy("date").reverse().toArray();
  return rows.filter((r) => !r.deletedAt)[0];
}

export async function saveBodyPhoto(blob: Blob): Promise<string> {
  const id = uid();
  await db.bodyPhotos.add({ id, blob, createdAt: new Date().toISOString() });
  return id;
}

export async function getBodyPhotoBlob(id: string) {
  const row = await db.bodyPhotos.get(id);
  return row?.blob;
}

// --- İçe aktarma günlüğü ---

export async function logHealthImportBatch(input: Omit<HealthImportBatch, "id">): Promise<string> {
  const id = uid();
  await db.healthImportBatches.add({ ...input, id });
  return id;
}
