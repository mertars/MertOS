import "server-only";
import type { ChatDeps } from "./chat";
import { getDb, getDbInfo } from "./db";
import { callGemini } from "./gemini";
import { dailyLimitFromEnv, withDailyLimit } from "./usage-guard";

export async function getChatDeps(): Promise<ChatDeps> {
  const db = await getDb();
  const { ftsAvailable } = await getDbInfo();
  return { db, llm: withDailyLimit(db, callGemini, dailyLimitFromEnv()), fts: ftsAvailable };
}
