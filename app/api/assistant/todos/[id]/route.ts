import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";
import { deleteTodo, getTodo, setTodoDone } from "@/lib/server/todo-repo";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const patchSchema = z.object({ done: z.boolean() });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = parseId((await ctx.params).id);
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!id || !parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  try {
    const db = await getDb();
    if (!(await getTodo(db, id))) return NextResponse.json({ error: "Madde bulunamadı." }, { status: 404 });
    await setTodoDone(db, id, parsed.data.done);
    return NextResponse.json({ todo: await getTodo(db, id) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = parseId((await ctx.params).id);
  if (!id) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  try {
    await deleteTodo(await getDb(), id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
