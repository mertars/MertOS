import "server-only";
import type { ChatDeps } from "./chat";
import { getDb, getDbInfo } from "./db";
import { callGemini } from "./gemini";

export async function getChatDeps(): Promise<ChatDeps> {
  const db = await getDb();
  const { ftsAvailable } = await getDbInfo();
  return { db, llm: callGemini, fts: ftsAvailable };
}
