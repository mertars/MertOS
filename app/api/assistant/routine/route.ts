import { NextResponse } from "next/server";
import { z } from "zod";
import { istanbulNow } from "@/lib/assistant/time";
import { setRoutineDone } from "@/lib/server/assistant-repo";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";

const bodySchema = z.object({
  item: z.enum(["uyanis", "buzlu_su", "hidrasyon", "soguk_dus", "kosu", "yuruyus", "wall_sit", "su", "temizlik"]),
  done: z.boolean(),
  /** Verilmezse bugün. Geçmiş güne yazma yalnızca açıkça istenirse (ekranda dünü düzeltmek gibi). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  const today = istanbulNow().date;
  const date = parsed.data.date ?? today;
  if (date > today) return NextResponse.json({ error: "Gelecek bir güne kayıt yazılamaz." }, { status: 400 });
  try {
    await setRoutineDone(await getDb(), date, parsed.data.item, parsed.data.done);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
