import { NextResponse } from "next/server";
import { istanbulNow } from "@/lib/assistant/time";
import { serializeBackup } from "@/lib/server/backup";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";

/** Sunucudaki asistan verisinin anlık yedeği — dosya olarak indirilir. */
export async function GET() {
  try {
    const body = await serializeBackup(await getDb());
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="mertos-sunucu-yedek-${istanbulNow().date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
