import { after, NextResponse } from "next/server";
import { z } from "zod";
import { extractIdleConversations, handleChat, NEW_CONVERSATION_HOURS, summarizeIfNeeded } from "@/lib/server/chat";
import { latestConversation, listMessages, getConversation } from "@/lib/server/chat-repo";
import { getChatDeps } from "@/lib/server/chat-deps";
import { errorResponse } from "@/lib/server/http";

const bodySchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  message: z.string().trim().min(1).max(2000),
  mode: z.enum(["yazi", "ses"]).default("yazi"),
});

/**
 * Yazılı (ve Faz 4'te sesli) sohbet. Sohbet veri değiştirmez; istisnalar: mesajlar, hafıza notları
 * ve Mert'in "yaptım" dediği günlük rutin maddelerinin işaretlenmesi (geri alınabilir).
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Mesaj boş olamaz." }, { status: 400 });
  try {
    const deps = await getChatDeps();
    const result = await handleChat(deps, parsed.data);
    // Cevap gittikten sonra: uzayan sohbeti özetle, sessiz kalmış eski sohbetlerden hafıza çıkar.
    after(async () => {
      try {
        await summarizeIfNeeded(deps, result.conversationId);
        await extractIdleConversations(deps, result.conversationId);
      } catch (e) {
        console.error("[mertos] arka plan işi:", e);
      }
    });
    return NextResponse.json({
      conversationId: result.conversationId,
      userMessage: result.userMessage,
      marks: result.marks,
      reply: result.reply,
      todo: result.todo,
      failure: result.failure ?? null,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Sohbet geçmişi. `conversationId` yoksa son sohbet (6 saatten yeniyse). */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("conversationId");
  try {
    const { db } = await getChatDeps();
    let conversation = id ? await getConversation(db, id) : await latestConversation(db);
    if (conversation && Date.now() - Date.parse(conversation.updatedAt) > NEW_CONVERSATION_HOURS * 3_600_000) conversation = null;
    if (!conversation) return NextResponse.json({ conversationId: null, messages: [] });
    return NextResponse.json({ conversationId: conversation.id, messages: await listMessages(db, conversation.id) });
  } catch (e) {
    return errorResponse(e);
  }
}
