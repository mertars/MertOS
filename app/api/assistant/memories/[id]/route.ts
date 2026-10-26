import { NextResponse } from "next/server";
import { z } from "zod";
import { getChatDeps } from "@/lib/server/chat-deps";
import { errorResponse } from "@/lib/server/http";
import { deleteMemory, getMemory, updateMemoryText } from "@/lib/server/memory-repo";

// Hafıza notunda yalnızca iki işlem var: düzelt ve sil (§ 8).

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const patchSchema = z.object({ text: z.string().trim().min(2).max(200) });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = parseId((await ctx.params).id);
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!id || !parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  try {
    const { db, fts } = await getChatDeps();
    await updateMemoryText(db, id, parsed.data.text, fts);
    return NextResponse.json({ memory: await getMemory(db, id) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = parseId((await ctx.params).id);
  if (!id) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  try {
    const { db, fts } = await getChatDeps();
    await deleteMemory(db, id, fts);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
