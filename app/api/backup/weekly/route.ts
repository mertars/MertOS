import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createBackup } from "@/lib/server/backup";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";

/** Vercel Cron haftada bir çağırır (vercel.json). Vercel, CRON_SECRET'i Authorization başlığında gönderir. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  if (!secret || expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await createBackup(await getDb())) });
  } catch (e) {
    return errorResponse(e);
  }
}
