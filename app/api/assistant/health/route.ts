import { NextResponse } from "next/server";
import { istanbulNow } from "@/lib/assistant/time";
import { getHealthHistory } from "@/lib/server/assistant-repo";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";

/** Sağlık geçmişi — LLM'siz. `?days=14` (en fazla 60), bugün dahil. */
export async function GET(req: Request) {
  const raw = Number(new URL(req.url).searchParams.get("days") ?? 14);
  const days = Number.isInteger(raw) ? Math.min(60, Math.max(1, raw)) : 14;
  try {
    const history = await getHealthHistory(await getDb(), istanbulNow().date, days);
    return NextResponse.json({ days: history }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
