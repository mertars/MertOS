import { format } from "date-fns";
import { db } from "@/lib/db/schema";
import type { CigaretteEntry, CigaretteSettings, CigaretteTrigger, ReductionPlan } from "@/lib/db/types";
import { SINGLETON_IDS, getCigaretteSettings } from "@/lib/db";
import { uid } from "@/lib/utils";
import { endOfLocalDayIso, startOfLocalDayIso } from "./water";

export async function addCigaretteEntry(trigger?: CigaretteTrigger, at: Date = new Date()): Promise<string> {
  const id = uid();
  const entry: CigaretteEntry = { id, at: at.toISOString(), trigger, createdAt: new Date().toISOString() };
  await db.cigaretteEntries.add(entry);
  await syncExpenseForDay(at);
  return id;
}

export async function softDeleteCigaretteEntry(id: string) {
  const row = await db.cigaretteEntries.get(id);
  await db.cigaretteEntries.update(id, { deletedAt: new Date().toISOString() });
  if (row) await syncExpenseForDay(new Date(row.at));
}

export async function restoreCigaretteEntry(id: string) {
  const row = await db.cigaretteEntries.get(id);
  await db.cigaretteEntries.update(id, { deletedAt: null });
  if (row) await syncExpenseForDay(new Date(row.at));
}

export async function getCigaretteEntriesForDay(date: Date = new Date()): Promise<CigaretteEntry[]> {
  const start = startOfLocalDayIso(date);
  const end = endOfLocalDayIso(date);
  const rows = await db.cigaretteEntries.where("at").between(start, end, true, true).toArray();
  return rows.filter((r) => !r.deletedAt).sort((a, b) => a.at.localeCompare(b.at));
}

export async function getLastCigaretteEntry(): Promise<CigaretteEntry | undefined> {
  const rows = await db.cigaretteEntries.orderBy("at").reverse().toArray();
  return rows.find((r) => !r.deletedAt);
}

export async function getCigaretteEntriesInRange(start: Date, end: Date): Promise<CigaretteEntry[]> {
  const rows = await db.cigaretteEntries.where("at").between(start.toISOString(), end.toISOString(), true, true).toArray();
  return rows.filter((r) => !r.deletedAt);
}

/** Bugünkü sigara harcamasını `expenses` tablosuna yazar (Finans modülü 2. aşamada bunu okuyacak). */
export async function syncExpenseForDay(date: Date) {
  const settings = await getCigaretteSettings();
  const entries = await getCigaretteEntriesForDay(date);
  const dayKey = format(date, "yyyy-MM-dd");
  const id = `sigara-${dayKey}`;
  const unitPrice = settings.cigsPerPack > 0 ? settings.packPrice / settings.cigsPerPack : 0;
  const amount = Math.round(entries.length * unitPrice * 100) / 100;

  if (amount <= 0) {
    await db.expenses.delete(id);
    return;
  }
  await db.expenses.put({
    id,
    date: dayKey,
    amount,
    category: "Sigara",
    source: "sigara",
    note: `${entries.length} adet × ${unitPrice.toFixed(2)} TL`,
    createdAt: new Date().toISOString(),
  });
}

export async function updateCigaretteSettings(patch: Partial<CigaretteSettings>) {
  await db.cigaretteSettings.update(SINGLETON_IDS.CIGARETTE_SETTINGS_ID, { ...patch, updatedAt: new Date().toISOString() });
}

export async function setReductionPlan(plan: ReductionPlan | null) {
  await updateCigaretteSettings({ reduction: plan, quitMode: false });
}

export async function setQuitMode(quitDate: Date) {
  await updateCigaretteSettings({ quitMode: true, quitDate: quitDate.toISOString(), reduction: null });
}

export async function disableQuitMode() {
  await updateCigaretteSettings({ quitMode: false, quitDate: null });
}
