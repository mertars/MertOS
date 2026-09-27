import { db } from "@/lib/db/schema";
import type { WaterEntry } from "@/lib/db/types";
import { uid } from "@/lib/utils";

export async function addWaterEntry(amountMl: number, at: Date = new Date()): Promise<string> {
  const id = uid();
  const entry: WaterEntry = { id, amountMl, at: at.toISOString(), createdAt: new Date().toISOString() };
  await db.waterEntries.add(entry);
  return id;
}

export async function softDeleteWaterEntry(id: string) {
  await db.waterEntries.update(id, { deletedAt: new Date().toISOString() });
}

export async function restoreWaterEntry(id: string) {
  await db.waterEntries.update(id, { deletedAt: null });
}

export async function hardDeleteWaterEntry(id: string) {
  await db.waterEntries.delete(id);
}

export function startOfLocalDayIso(date: Date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function endOfLocalDayIso(date: Date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export async function getWaterEntriesForDay(date: Date = new Date()): Promise<WaterEntry[]> {
  const start = startOfLocalDayIso(date);
  const end = endOfLocalDayIso(date);
  const rows = await db.waterEntries.where("at").between(start, end, true, true).toArray();
  return rows.filter((r) => !r.deletedAt).sort((a, b) => a.at.localeCompare(b.at));
}

export async function getWaterTotalForDay(date: Date = new Date()): Promise<number> {
  const rows = await getWaterEntriesForDay(date);
  return rows.reduce((sum, r) => sum + r.amountMl, 0);
}
