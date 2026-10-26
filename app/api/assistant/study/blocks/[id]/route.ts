import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";
import { deleteBlock, restoreBlock } from "@/lib/server/study-repo";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Sil (yumuşak) — ekrandaki "Geri al" PATCH { restore: true } ile geri getirir. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = parseId((await ctx.params).id);
  if (!id) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  try {
    await deleteBlock(await getDb(), id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = parseId((await ctx.params).id);
  const parsed = z.object({ restore: z.literal(true) }).safeParse(await req.json().catch(() => null));
  if (!id || !parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  try {
    await restoreBlock(await getDb(), id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
