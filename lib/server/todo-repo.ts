import type { Client, Row } from "@libsql/client";
import { normalizeTr } from "@/lib/assistant/text";
import type { TodoItem } from "@/lib/assistant/types";

// Yapılacaklar listesi. Silme yumuşak (deleted_at) — sohbetteki "Geri al" ve
// ekrandaki silme aynı yolu kullanır.

function toTodo(r: Row): TodoItem {
  return {
    id: Number(r.id),
    title: String(r.title),
    date: String(r.date),
    time: r.time == null ? null : String(r.time),
    done: Number(r.done) === 1,
    source: String(r.source),
  };
}

/** Tarih aralığındaki (dahil) silinmemiş maddeler — tarih, sonra saat sırasıyla (saatsizler gün sonunda). */
export async function listTodos(db: Client, from: string, to: string): Promise<TodoItem[]> {
  const res = await db.execute({
    sql: `SELECT * FROM todos WHERE deleted_at IS NULL AND date >= ? AND date <= ? ORDER BY date, time IS NULL, time, id`,
    args: [from, to],
  });
  return res.rows.map(toTodo);
}

export async function getTodo(db: Client, id: number): Promise<TodoItem | null> {
  const res = await db.execute({ sql: `SELECT * FROM todos WHERE id = ? AND deleted_at IS NULL`, args: [id] });
  return res.rows[0] ? toTodo(res.rows[0]) : null;
}

/** Aynı gün aynı başlıkta (normalize) madde varsa onu döner — sohbet aynı şeyi iki kez eklemesin. */
export async function findSameTodo(db: Client, date: string, title: string): Promise<TodoItem | null> {
  const key = normalizeTr(title);
  return (await listTodos(db, date, date)).find((t) => normalizeTr(t.title) === key) ?? null;
}

export async function addTodo(db: Client, t: { title: string; date: string; time: string | null }, source = "ekran"): Promise<TodoItem> {
  const res = await db.execute({
    sql: `INSERT INTO todos (title, date, time, done, source, created_at) VALUES (?, ?, ?, 0, ?, ?)`,
    args: [t.title, t.date, t.time, source, new Date().toISOString()],
  });
  return { id: Number(res.lastInsertRowid), title: t.title, date: t.date, time: t.time, done: false, source };
}

export async function setTodoDone(db: Client, id: number, done: boolean) {
  await db.execute({ sql: `UPDATE todos SET done = ?, done_at = ? WHERE id = ?`, args: [done ? 1 : 0, done ? new Date().toISOString() : null, id] });
}

export async function deleteTodo(db: Client, id: number) {
  await db.execute({ sql: `UPDATE todos SET deleted_at = ? WHERE id = ?`, args: [new Date().toISOString(), id] });
}
