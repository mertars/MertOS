import { NextResponse } from "next/server";
import { getChatDeps } from "@/lib/server/chat-deps";
import { errorResponse } from "@/lib/server/http";
import { listActiveMemories } from "@/lib/server/memory-repo";

export async function GET() {
  try {
    const { db } = await getChatDeps();
    return NextResponse.json({ memories: await listActiveMemories(db) });
  } catch (e) {
    return errorResponse(e);
  }
}
