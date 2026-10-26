import type { Client, Row } from "@libsql/client";
import type { MemoryCategory } from "@/lib/assistant/memory-extract";
import { buildFtsQuery, contentWords, normalizeTr } from "@/lib/assistant/text";

// Hafıza notları + FTS5 indeksi (`memories_fts`, rowid = memories.id).
// FTS5 yoksa (ftsAvailable=false) kelime bazlı LIKE aramasına düşer.

export interface Memory {
  id: number;
  category: MemoryCategory;
  text: string;
  createdAt: string;
  updatedAt: string;
  sourceConversationId: string | null;
  confidence: number;
  status: "aktif" | "silindi" | "ozetlendi";
  lastUsedAt: string | null;
}

function toMemory(r: Row): Memory {
  return {
    id: Number(r.id),
    category: String(r.category) as MemoryCategory,
    text: String(r.text),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    sourceConversationId: r.source_conversation_id == null ? null : String(r.source_conversation_id),
    confidence: Number(r.confidence),
    status: String(r.status) as Memory["status"],
    lastUsedAt: r.last_used_at == null ? null : String(r.last_used_at),
  };
}

export async function addMemory(
  db: Client,
  m: { category: MemoryCategory; text: string; sourceConversationId: string | null; confidence: number },
  fts: boolean,
): Promise<number> {
  const now = new Date().toISOString();
  const res = await db.execute({
    sql: `INSERT INTO memories (category, text, created_at, updated_at, source_conversation_id, confidence) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [m.category, m.text, now, now, m.sourceConversationId, m.confidence],
  });
  const id = Number(res.lastInsertRowid);
  if (fts) await db.execute({ sql: `INSERT INTO memories_fts (rowid, text_norm) VALUES (?, ?)`, args: [id, normalizeTr(m.text)] });
  return id;
}

export async function updateMemoryText(db: Client, id: number, text: string, fts: boolean) {
  await db.execute({ sql: `UPDATE memories SET text = ?, updated_at = ? WHERE id = ? AND status = 'aktif'`, args: [text, new Date().toISOString(), id] });
  if (fts) {
    await db.batch(
      [
        { sql: `DELETE FROM memories_fts WHERE rowid = ?`, args: [id] },
        { sql: `INSERT INTO memories_fts (rowid, text_norm) VALUES (?, ?)`, args: [id, normalizeTr(text)] },
      ],
      "write",
    );
  }
}

/** Silinen not bir daha bağlama girmez (§ 8). */
export async function deleteMemory(db: Client, id: number, fts: boolean) {
  await db.execute({ sql: `UPDATE memories SET status = 'silindi', updated_at = ? WHERE id = ?`, args: [new Date().toISOString(), id] });
  if (fts) await db.execute({ sql: `DELETE FROM memories_fts WHERE rowid = ?`, args: [id] });
}

/** Hafızam ekranındaki "Geri al": yalnızca silinmiş notu geri getirir. */
export async function restoreMemory(db: Client, id: number, fts: boolean): Promise<boolean> {
  const res = await db.execute({ sql: `UPDATE memories SET status = 'aktif', updated_at = ? WHERE id = ? AND status = 'silindi'`, args: [new Date().toISOString(), id] });
  if (!res.rowsAffected) return false;
  const m = await getMemory(db, id);
  if (fts && m) await db.execute({ sql: `INSERT INTO memories_fts (rowid, text_norm) VALUES (?, ?)`, args: [id, normalizeTr(m.text)] });
  return true;
}

export async function getMemory(db: Client, id: number): Promise<Memory | null> {
  const r = (await db.execute({ sql: `SELECT * FROM memories WHERE id = ?`, args: [id] })).rows[0];
  return r ? toMemory(r) : null;
}

export async function listActiveMemories(db: Client): Promise<Memory[]> {
  return (await db.execute(`SELECT * FROM memories WHERE status = 'aktif' ORDER BY id DESC`)).rows.map(toMemory);
}

/** Mesajla ilgili en fazla `limit` aktif not. Kullanılan notların `last_used_at`'i güncellenir. */
export async function searchMemories(db: Client, message: string, fts: boolean, limit = 5): Promise<Memory[]> {
  let rows: Row[] = [];
  if (fts) {
    const q = buildFtsQuery(message);
    if (q) {
      rows = (
        await db.execute({
          sql: `SELECT m.* FROM memories_fts f JOIN memories m ON m.id = f.rowid
                WHERE memories_fts MATCH ? AND m.status = 'aktif' ORDER BY bm25(memories_fts) LIMIT ?`,
          args: [q, limit],
        })
      ).rows;
    }
  } else {
    const words = [...new Set(contentWords(message).map((w) => w.slice(0, 6)))].slice(0, 8);
    if (words.length) {
      // LIKE yedeği: normalize edilmiş metin sütunu yok, bu yüzden aktif notları alıp JS'te süz.
      const all = await listActiveMemories(db);
      return all.filter((m) => words.some((w) => normalizeTr(m.text).includes(w))).slice(0, limit);
    }
  }
  const memories = rows.map(toMemory);
  if (memories.length) {
    await db.execute({
      sql: `UPDATE memories SET last_used_at = ? WHERE id IN (${memories.map(() => "?").join(",")})`,
      args: [new Date().toISOString(), ...memories.map((m) => m.id)],
    });
  }
  return memories;
}
