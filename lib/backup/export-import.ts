import { db } from "@/lib/db/schema";

export const BACKUP_SCHEMA_VERSION = 1;

interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  app: "mertos";
  data: Record<string, unknown[]>;
}

const TABLE_NAMES = [
  "profile",
  "settings",
  "workouts",
  "strengthSets",
  "personalRecords",
  "programs",
  "programProgress",
  "waterEntries",
  "cigaretteEntries",
  "cigaretteSettings",
  "expenses",
  "quickAddUsage",
] as const;

export async function exportAllData(): Promise<BackupPayload> {
  const data: Record<string, unknown[]> = {};
  for (const name of TABLE_NAMES) {
    data[name] = await (db as unknown as Record<string, { toArray: () => Promise<unknown[]> }>)[name].toArray();
  }
  return { schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: new Date().toISOString(), app: "mertos", data };
}

export function downloadBackupFile(payload: BackupPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = payload.exportedAt.slice(0, 10);
  a.href = url;
  a.download = `mertos-yedek-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export class BackupImportError extends Error {}

/** Bir JSON dosyasını içe aktarır. Şema versiyonu ileride değişirse burada migration adımları eklenecek. */
export async function importBackupFile(file: File): Promise<void> {
  const text = await file.text();
  let parsed: BackupPayload;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupImportError("Dosya okunamadı — geçerli bir MertOS yedeği değil.");
  }

  if (parsed.app !== "mertos" || !parsed.data) {
    throw new BackupImportError("Bu dosya bir MertOS yedeği gibi görünmüyor.");
  }
  if (parsed.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new BackupImportError("Bu yedek, uygulamanın daha yeni bir sürümünden alınmış. Önce uygulamayı güncelle.");
  }

  await db.transaction("rw", db.tables, async () => {
    for (const name of TABLE_NAMES) {
      const rows = parsed.data[name];
      if (!Array.isArray(rows)) continue;
      const table = (db as unknown as Record<string, { clear: () => Promise<void>; bulkAdd: (r: unknown[]) => Promise<unknown> }>)[name];
      await table.clear();
      if (rows.length > 0) await table.bulkAdd(rows);
    }
  });
}

export async function eraseAllData(): Promise<void> {
  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
}
