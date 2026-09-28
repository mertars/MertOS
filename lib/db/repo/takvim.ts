import { db } from "@/lib/db/schema";
import type { ImportantDate, RoutineBlockTemplate, RoutineTemplate, RoutineType, ScheduleBlock } from "@/lib/db/types";
import { uid } from "@/lib/utils";
import { dateKey } from "./workouts";

// --- Günlük zaman çizelgesi ---

export async function addScheduleBlock(input: { date?: Date; startTime: string; endTime: string; label: string; colorVar?: string }): Promise<string> {
  const id = uid();
  const block: ScheduleBlock = { id, date: dateKey(input.date), startTime: input.startTime, endTime: input.endTime, label: input.label, colorVar: input.colorVar, createdAt: new Date().toISOString() };
  await db.scheduleBlocks.add(block);
  return id;
}

export async function toggleScheduleBlockCompleted(id: string, completed: boolean) {
  await db.scheduleBlocks.update(id, { completed });
}

export async function deleteScheduleBlock(id: string) {
  await db.scheduleBlocks.delete(id);
}

export async function getScheduleBlocksForDate(date: Date = new Date()): Promise<ScheduleBlock[]> {
  const rows = await db.scheduleBlocks.where("date").equals(dateKey(date)).toArray();
  return rows.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

// --- Rutin şablonları ---

export async function addRoutineTemplate(name: string, type: RoutineType, blocks: RoutineBlockTemplate[]): Promise<string> {
  const id = uid();
  const template: RoutineTemplate = { id, name, type, blocks, createdAt: new Date().toISOString() };
  await db.routineTemplates.add(template);
  return id;
}

export async function getRoutineTemplates(): Promise<RoutineTemplate[]> {
  return db.routineTemplates.toArray();
}

export async function deleteRoutineTemplate(id: string) {
  await db.routineTemplates.delete(id);
}

/** Bir rutin şablonunu belirtilen güne uygular — o günün bloklarını oluşturur. */
export async function applyRoutineTemplate(templateId: string, date: Date = new Date()) {
  const template = await db.routineTemplates.get(templateId);
  if (!template) return;
  const rows: ScheduleBlock[] = template.blocks.map((b) => {
    const [h, m] = b.time.split(":").map(Number);
    const endMinutes = h * 60 + m + b.durationMin;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;
    return {
      id: uid(),
      date: dateKey(date),
      startTime: b.time,
      endTime: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
      label: b.label,
      createdAt: new Date().toISOString(),
    };
  });
  await db.scheduleBlocks.bulkAdd(rows);
}

// --- Önemli günler ---

export async function addImportantDate(input: { label: string; date: string; repeatsYearly: boolean; note?: string }): Promise<string> {
  const id = uid();
  const row: ImportantDate = { id, ...input, createdAt: new Date().toISOString() };
  await db.importantDates.add(row);
  return id;
}

export async function getAllImportantDates(): Promise<ImportantDate[]> {
  return db.importantDates.toArray();
}

export async function deleteImportantDate(id: string) {
  await db.importantDates.delete(id);
}

/** Yıllık tekrar eden bir tarih için bir sonraki oluşumuna kaç gün kaldığını hesaplar. */
export function daysUntilNextOccurrence(dateIso: string, repeatsYearly: boolean): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const target = new Date(dateIso);
  if (repeatsYearly) {
    target.setFullYear(todayStart.getFullYear());
    if (target.getTime() < todayStart.getTime()) target.setFullYear(target.getFullYear() + 1);
  }
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000);
}
