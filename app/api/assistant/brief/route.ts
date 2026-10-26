import { NextResponse } from "next/server";
import { istanbulNow, isValidDate } from "@/lib/assistant/time";
import { getDailyBrief } from "@/lib/server/assistant-repo";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";

/** Günlük özet — LLM'siz (görev dosyası § 5). `?date=YYYY-MM-DD` verilmezse bugün (Türkiye saati). */
export async function GET(req: Request) {
  const now = istanbulNow();
  const date = new URL(req.url).searchParams.get("date") ?? now.date;
  if (!isValidDate(date)) return NextResponse.json({ error: "Geçersiz tarih." }, { status: 400 });
  try {
    const brief = await getDailyBrief(await getDb(), date, date === now.date ? now.time : "23:59");
    return NextResponse.json(brief, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
