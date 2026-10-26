import { NextResponse } from "next/server";
import { z } from "zod";
import { extractMemories } from "@/lib/server/chat";
import { getChatDeps } from "@/lib/server/chat-deps";
import { errorResponse } from "@/lib/server/http";

const bodySchema = z.object({ conversationId: z.string().uuid() });

/** Sohbet bitti (sayfadan çıkış / "Yeni sohbet"): hafif modelle kalıcı notları çıkar (§ 7.3). */
export async function POST(req: Request) {
  const text = await req.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // sendBeacon gövdesi bozuksa yok say
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  try {
    const notes = await extractMemories(await getChatDeps(), parsed.data.conversationId);
    return NextResponse.json({ notes });
  } catch (e) {
    return errorResponse(e);
  }
}
