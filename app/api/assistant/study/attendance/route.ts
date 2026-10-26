import { NextResponse } from "next/server";
import { z } from "zod";
import { istanbulNow, isValidDate } from "@/lib/assistant/time";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";
import { listSessions, setAttendance } from "@/lib/server/study-repo";

const bodySchema = z.object({ sessionId: z.string().min(1).max(40), attended: z.boolean(), date: z.string().refine(isValidDate).optional() });

/** "Derse gittim" — tek dokunuş, geri alınabilir (attended: false). */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  const date = parsed.data.date ?? istanbulNow().date;
  if (date > istanbulNow().date) return NextResponse.json({ error: "İleri tarih." }, { status: 400 });
  try {
    const db = await getDb();
    if (!(await listSessions(db)).some((s) => s.id === parsed.data.sessionId)) return NextResponse.json({ error: "Ders bulunamadı." }, { status: 400 });
    await setAttendance(db, date, parsed.data.sessionId, parsed.data.attended);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
