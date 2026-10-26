import type { Client } from "@libsql/client";
import { BACKUP_TABLES } from "./schema";

// Haftalık otomatik yedek (Vercel Cron → /api/backup/weekly). Yedek aynı
// Turso veritabanındaki `backups` tablosuna yazılır: uygulama hatası ya da
// yanlışlıkla silmeye karşı korur. Veritabanının tamamen kaybına karşı
// Ayarlar'daki "Sunucu yedeğini indir" ile alınan dosya ek güvencedir.

export const BACKUP_KEEP = 8;

export async function dumpTables(db: Client): Promise<Record<string, unknown[]>> {
  const out: Record<string, unknown[]> = {};
  for (const table of BACKUP_TABLES) {
    const res = await db.execute(`SELECT * FROM ${table}`);
    out[table] = res.rows.map((r) => Object.fromEntries(res.columns.map((c) => [c, r[c]])));
  }
  return out;
}

/** Asistan tablolarının JSON yedeği (libSQL büyük sayıları bigint döndürebilir → number). */
export async function serializeBackup(db: Client): Promise<string> {
  const tables = await dumpTables(db);
  return JSON.stringify({ app: "mertos-asistan", createdAt: new Date().toISOString(), tables }, (_k, v) =>
    typeof v === "bigint" ? Number(v) : v,
  );
}

export async function createBackup(db: Client): Promise<{ id: number; size: number }> {
  const data = await serializeBackup(db);
  const res = await db.execute({ sql: `INSERT INTO backups (created_at, size, data) VALUES (?, ?, ?)`, args: [new Date().toISOString(), data.length, data] });
  await db.execute({ sql: `DELETE FROM backups WHERE id NOT IN (SELECT id FROM backups ORDER BY id DESC LIMIT ?)`, args: [BACKUP_KEEP] });
  return { id: Number(res.lastInsertRowid), size: data.length };
}
