import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";
import { setTopicDone } from "@/lib/server/study-repo";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  const parsed = z.object({ done: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  try {
    await setTopicDone(await getDb(), id, parsed.data.done);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
