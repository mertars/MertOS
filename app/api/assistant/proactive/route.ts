import { NextResponse } from "next/server";
import { z } from "zod";
import { istanbulNow } from "@/lib/assistant/time";
import { PROACTIVE_SLOTS } from "@/lib/assistant/proactive";
import { getChatDeps } from "@/lib/server/chat-deps";
import { errorResponse } from "@/lib/server/http";
import { handleProactive, spokenSlots } from "@/lib/server/proactive";

const bodySchema = z.object({
  slot: z.enum(PROACTIVE_SLOTS as [string, ...string[]]),
  conversationId: z.string().uuid().nullable().optional(),
});

/**
 * Planlı konuşma (Faz 4): istemci saatin geldiğini bildirir, sunucu doğrulayıp
 * (saat, yapılmış mı, bugün söylendi mi) asistan mesajını sohbete yazar.
 * Model ulaşılamazsa koddan hazır cümle — bu uç hiçbir zaman "kota" hatası vermez.
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  try {
    const deps = await getChatDeps();
    const result = await handleProactive(deps, parsed.data.slot as (typeof PROACTIVE_SLOTS)[number], parsed.data.conversationId);
    const spoken = await spokenSlots(deps.db, istanbulNow().date);
    return NextResponse.json({ message: result.message, reason: result.message ? undefined : result.reason, spoken });
  } catch (e) {
    return errorResponse(e);
  }
}
