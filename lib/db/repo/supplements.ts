import { db } from "@/lib/db/schema";
import type { Supplement } from "@/lib/db/types";
import { uid } from "@/lib/utils";
import { dateKey } from "./workouts";

export async function addSupplement(input: { name: string; dosage?: string; timeOfDay?: string }): Promise<string> {
  const id = uid();
  const row: Supplement = { id, ...input, active: true, createdAt: new Date().toISOString() };
  await db.supplements.add(row);
  return id;
}

export async function getActiveSupplements(): Promise<Supplement[]> {
  const all = await db.supplements.toArray();
  return all.filter((s) => s.active);
}

export async function deactivateSupplement(id: string) {
  await db.supplements.update(id, { active: false });
}

export async function getLogsForDate(date: Date = new Date()): Promise<Record<string, boolean>> {
  const key = dateKey(date);
  const rows = await db.supplementLogs.where("date").equals(key).toArray();
  return Object.fromEntries(rows.map((r) => [r.supplementId, r.taken]));
}

export async function setSupplementTaken(supplementId: string, date: Date, taken: boolean) {
  const key = dateKey(date);
  const id = `${supplementId}__${key}`;
  await db.supplementLogs.put({ id, supplementId, date: key, taken });
}
