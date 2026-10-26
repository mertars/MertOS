import { NextResponse } from "next/server";
import { istanbulNow } from "@/lib/assistant/time";
import { getSettings } from "@/lib/server/assistant-repo";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";
import { getStudyOverview } from "@/lib/server/study-repo";

/** Ders ve sınav ekranı (Bölüm 18): program, sınavlar, KODLA hesaplanan plan, kayıtlar. */
export async function GET() {
  try {
    const db = await getDb();
    return NextResponse.json(await getStudyOverview(db, istanbulNow(), await getSettings(db)));
  } catch (e) {
    return errorResponse(e);
  }
}
