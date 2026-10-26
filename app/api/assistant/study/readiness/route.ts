import { NextResponse } from "next/server";
import { z } from "zod";
import { istanbulNow } from "@/lib/assistant/time";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";
import { setReadiness } from "@/lib/server/study-repo";
import { knownCourse } from "../validate";

const bodySchema = z.object({ courseId: z.string().min(1).max(20), score: z.number().int().min(1).max(5) });

/** Hazırlık puanı (1–5). Her güncelleme yeni satır; plan en sonuncusunu kullanır. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz puan." }, { status: 400 });
  try {
    const db = await getDb();
    if (!(await knownCourse(db, parsed.data.courseId))) return NextResponse.json({ error: "Ders bulunamadı." }, { status: 400 });
    await setReadiness(db, parsed.data.courseId, parsed.data.score, istanbulNow().date);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
