import type { Client, Row } from "@libsql/client";
import type { ChatMode } from "@/lib/assistant/persona";
import type { RoutineItem } from "@/lib/assistant/types";

// Sohbetler ve mesajlar. Rol "not" = sistem satırı: "Not aldım: …" (meta.memoryId)
// ya da sohbetten rutin işaretleme "İşaretledim: …" (meta.routine). Modele gitmez.

export type MessageRole = "user" | "assistant" | "not";

export interface ChatMessage {
  id: number;
  conversationId: string;
  role: MessageRole;
  content: string;
  mode: ChatMode;
  createdAt: string;
  /**
   * memoryId: "Not aldım" satırının notu; routine: sohbetten işaretlenen maddeler (geri alınabilir);
   * routineUndone: işaretleme geri alındı; system: kota/hata mesajı (modele geçmiş olarak gitmez)
   */
  meta: { memoryId?: number; routine?: { date: string; items: RoutineItem[] }; routineUndone?: boolean; system?: boolean } | null;
}

export interface Conversation {
  id: string;
  startedAt: string;
  updatedAt: string;
  summary: string | null;
  summarizedUpto: number;
  memoryExtractedAt: string | null;
}

function toMessage(r: Row): ChatMessage {
  let meta: ChatMessage["meta"] = null;
  if (typeof r.meta === "string") {
    try {
      meta = JSON.parse(r.meta);
    } catch {
      meta = null;
    }
  }
  return {
    id: Number(r.id),
    conversationId: String(r.conversation_id),
    role: String(r.role) as MessageRole,
    content: String(r.content),
    mode: String(r.mode) as ChatMode,
    createdAt: String(r.created_at),
    meta,
  };
}

function toConversation(r: Row): Conversation {
  return {
    id: String(r.id),
    startedAt: String(r.started_at),
    updatedAt: String(r.updated_at),
    summary: r.summary == null ? null : String(r.summary),
    summarizedUpto: Number(r.summarized_upto),
    memoryExtractedAt: r.memory_extracted_at == null ? null : String(r.memory_extracted_at),
  };
}

export async function getConversation(db: Client, id: string): Promise<Conversation | null> {
  const r = (await db.execute({ sql: `SELECT * FROM conversations WHERE id = ?`, args: [id] })).rows[0];
  return r ? toConversation(r) : null;
}

export async function createConversation(db: Client): Promise<Conversation> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute({ sql: `INSERT INTO conversations (id, started_at, updated_at) VALUES (?, ?, ?)`, args: [id, now, now] });
  return { id, startedAt: now, updatedAt: now, summary: null, summarizedUpto: 0, memoryExtractedAt: null };
}

export async function latestConversation(db: Client): Promise<Conversation | null> {
  const r = (await db.execute(`SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 1`)).rows[0];
  return r ? toConversation(r) : null;
}

export async function addMessage(
  db: Client,
  m: { conversationId: string; role: MessageRole; content: string; mode: ChatMode; meta?: ChatMessage["meta"] },
): Promise<ChatMessage> {
  const now = new Date().toISOString();
  const res = await db.execute({
    sql: `INSERT INTO messages (conversation_id, role, content, mode, created_at, meta) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [m.conversationId, m.role, m.content, m.mode, now, m.meta ? JSON.stringify(m.meta) : null],
  });
  await db.execute({ sql: `UPDATE conversations SET updated_at = ? WHERE id = ?`, args: [now, m.conversationId] });
  return { id: Number(res.lastInsertRowid), conversationId: m.conversationId, role: m.role, content: m.content, mode: m.mode, createdAt: now, meta: m.meta ?? null };
}

export async function getMessage(db: Client, id: number): Promise<ChatMessage | null> {
  const res = await db.execute({ sql: `SELECT * FROM messages WHERE id = ?`, args: [id] });
  return res.rows[0] ? toMessage(res.rows[0]) : null;
}

export async function updateMessage(db: Client, id: number, content: string, meta: ChatMessage["meta"]) {
  await db.execute({ sql: `UPDATE messages SET content = ?, meta = ? WHERE id = ?`, args: [content, meta ? JSON.stringify(meta) : null, id] });
}

export async function listMessages(db: Client, conversationId: string): Promise<ChatMessage[]> {
  return (await db.execute({ sql: `SELECT * FROM messages WHERE conversation_id = ? ORDER BY id`, args: [conversationId] })).rows.map(toMessage);
}

export async function setSummary(db: Client, conversationId: string, summary: string, upto: number) {
  await db.execute({ sql: `UPDATE conversations SET summary = ?, summarized_upto = ? WHERE id = ?`, args: [summary, upto, conversationId] });
}

export async function markMemoryExtracted(db: Client, conversationId: string) {
  await db.execute({ sql: `UPDATE conversations SET memory_extracted_at = ? WHERE id = ?`, args: [new Date().toISOString(), conversationId] });
}

/** Hafıza çıkarılmamış ve en az `idleMinutes` dakikadır sessiz sohbetler. */
export async function listIdleUnextracted(db: Client, idleMinutes: number, exceptId?: string): Promise<Conversation[]> {
  const cutoff = new Date(Date.now() - idleMinutes * 60_000).toISOString();
  return (
    await db.execute({
      sql: `SELECT * FROM conversations WHERE updated_at < ? AND (memory_extracted_at IS NULL OR memory_extracted_at < updated_at) AND id != ? ORDER BY updated_at LIMIT 3`,
      args: [cutoff, exceptId ?? ""],
    })
  ).rows.map(toConversation);
}
