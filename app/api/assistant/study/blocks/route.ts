import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";
import { addBlocks, listCourses } from "@/lib/server/study-repo";
import { blockEntry, notFuture } from "../validate";

// Çalışma bloğu kaydı: tek kayıt (ekrandan) ya da toplu (Notlar'dan geriye dönük).
const bodySchema = z.union([blockEntry, z.object({ entries: z.array(blockEntry).min(1).max(100) })]);

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz kayıt." }, { status: 400 });
  const entries = "entries" in parsed.data ? parsed.data.entries : [parsed.data];
  const source = "entries" in parsed.data ? "notlar" : "ekran";
  try {
    const db = await getDb();
    const ids = new Set((await listCourses(db)).map((c) => c.id));
    if (entries.some((e) => !ids.has(e.courseId))) return NextResponse.json({ error: "Ders bulunamadı." }, { status: 400 });
    if (entries.some((e) => !notFuture(e.date))) return NextResponse.json({ error: "İleri bir tarihe çalışma yazılamaz." }, { status: 400 });
    const blocks = [];
    for (const e of entries) blocks.push(await addBlocks(db, e, source));
    return NextResponse.json({ blocks });
  } catch (e) {
    return errorResponse(e);
  }
}
