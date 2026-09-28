import { NextResponse } from "next/server";
import { z } from "zod";
import { isRedisConfigured, saveSummary } from "@/lib/notifications/server-store";

const bodySchema = z.object({
  isim: z.string(),
  su_kalan: z.coerce.number(),
  sigara_bugun: z.coerce.number(),
  sigara_limit: z.coerce.number(),
  son_sigara: z.string(),
  seri: z.coerce.number(),
  siradaki_antrenman: z.string(),
  protein_kalan: z.coerce.number(),
});

/**
 * İstemci, sadece bildirim metinlerinde kullanılacak KÜÇÜK bir sayısal özeti
 * (ham kayıt değil) burada senkronize eder — bkz. görev tanımı § 9.
 */
export async function POST(req: Request) {
  if (!isRedisConfigured()) {
    return NextResponse.json({ error: "Bildirim sunucusu yapılandırılmamış." }, { status: 503 });
  }
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }
  await saveSummary({ ...parsed.data, updatedAt: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
