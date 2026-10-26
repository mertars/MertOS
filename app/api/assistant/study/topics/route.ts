import { NextResponse } from "next/server";
import { z } from "zod";
import { parseSyllabus } from "@/lib/assistant/study";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";
import { replaceTopics } from "@/lib/server/study-repo";
import { knownCourse } from "../validate";

const bodySchema = z.object({ courseId: z.string().min(1).max(20), text: z.string().max(20000) });

/** Müfredat yapıştır → konu kontrol listesi (kodla satır satır; boş metin listeyi kaldırır). */
export async function PUT(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  try {
    const db = await getDb();
    if (!(await knownCourse(db, parsed.data.courseId))) return NextResponse.json({ error: "Ders bulunamadı." }, { status: 400 });
    const titles = parseSyllabus(parsed.data.text);
    await replaceTopics(db, parsed.data.courseId, titles);
    return NextResponse.json({ count: titles.length });
  } catch (e) {
    return errorResponse(e);
  }
}
