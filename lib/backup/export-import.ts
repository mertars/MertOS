import { db } from "@/lib/db/schema";

export const BACKUP_SCHEMA_VERSION = 1;

interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  app: "mertos";
  data: Record<string, unknown[]>;
}

/**
 * Fotoğraf tabloları (`mealPhotos`, `bodyPhotos`) Blob tutuyor — JSON.stringify
 * Blob'u `{}` yapar, bu yüzden yedekte data URL'e çevrilip geri yüklenirken
 * tekrar Blob'a dönüştürülüyor.
 */
interface SerializedBlob {
  __blob: string;
}

function isSerializedBlob(value: unknown): value is SerializedBlob {
  return typeof value === "object" && value !== null && typeof (value as SerializedBlob).__blob === "string";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function serializeRow(row: unknown): Promise<unknown> {
  if (typeof row !== "object" || row === null) return row;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = value instanceof Blob ? { __blob: await blobToDataUrl(value) } : value;
  }
  return out;
}

async function deserializeRow(row: unknown): Promise<unknown> {
  if (typeof row !== "object" || row === null) return row;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = isSerializedBlob(value) ? await (await fetch(value.__blob)).blob() : value;
  }
  return out;
}

/** Tüm Dexie tabloları (v1 + v2) yedeğe girer — tablo listesi elle tutulmuyor. */
export async function exportAllData(): Promise<BackupPayload> {
  const data: Record<string, unknown[]> = {};
  for (const table of db.tables) {
    const rows = await table.toArray();
    data[table.name] = await Promise.all(rows.map(serializeRow));
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

  // Blob dönüşümü async (fetch) olduğu için transaction'dan ÖNCE yapılıyor —
  // Dexie transaction'ı içinde Dexie dışı bir await transaction'ı kapatır.
  const restored: Record<string, unknown[]> = {};
  for (const table of db.tables) {
    const rows = parsed.data[table.name];
    if (!Array.isArray(rows)) continue;
    restored[table.name] = await Promise.all(rows.map(deserializeRow));
  }

  // Yedekte olmayan tablolara dokunulmaz (eski, sadece v1 tablolarını içeren yedekler de çalışır).
  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) {
      const rows = restored[table.name];
      if (!rows) continue;
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
