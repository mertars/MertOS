import { NextResponse } from "next/server";
import { z } from "zod";
import { parseStudyImport } from "@/lib/assistant/study";
import { istanbulNow } from "@/lib/assistant/time";
import { getSettings } from "@/lib/server/assistant-repo";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";
import { listCourses } from "@/lib/server/study-repo";

const bodySchema = z.object({ text: z.string().min(1).max(20000) });

/** Notlar'daki listeyi ÖNİZLER (kaydetmez): satır satır tarih + ders + blok. Kayıt: POST /blocks { entries }. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Metin boş." }, { status: 400 });
  try {
    const db = await getDb();
    const [courses, settings] = await Promise.all([listCourses(db), getSettings(db)]);
    return NextResponse.json({ lines: parseStudyImport(parsed.data.text, { today: istanbulNow().date, courses, blockMin: settings.blokDk }) });
  } catch (e) {
    return errorResponse(e);
  }
}
