import { NextResponse } from "next/server";
import { undoRoutineMark } from "@/lib/server/chat";
import { getChatDeps } from "@/lib/server/chat-deps";
import { errorResponse } from "@/lib/server/http";

/** Sohbetten yapılan rutin işaretlemesini geri alır ("İşaretledim" satırındaki "Geri al"). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  try {
    const { db } = await getChatDeps();
    const message = await undoRoutineMark(db, id);
    if (!message) return NextResponse.json({ error: "Geri alınacak işaret yok." }, { status: 404 });
    return NextResponse.json({ message });
  } catch (e) {
    return errorResponse(e);
  }
}
