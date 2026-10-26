import { NextResponse } from "next/server";
import { createBackup } from "@/lib/server/backup";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";

/** Vercel Cron haftada bir çağırır (vercel.json). Vercel, CRON_SECRET'i Authorization başlığında gönderir. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await createBackup(await getDb())) });
  } catch (e) {
    return errorResponse(e);
  }
}
