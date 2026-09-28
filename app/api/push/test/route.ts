import { NextResponse } from "next/server";
import { z } from "zod";
import { getNotificationRecord, getSummary, isRedisConfigured } from "@/lib/notifications/server-store";
import { isVapidConfigured, sendPush } from "@/lib/notifications/push-sender";
import { interpolateTemplate, pickRandomTemplate } from "@/lib/notifications/templates";
import { CATEGORY_LABEL } from "@/lib/notifications/types";

const bodySchema = z.object({ category: z.enum(["su", "antrenman", "sigara", "uyku", "beslenme", "gorevler", "aliskanliklar", "haftalik_rapor", "koc"]) });

/** Ayarlar > Bildirimler'deki "Test bildirimi gönder" butonu için — zamanlamayı yok sayıp hemen gönderir. */
export async function POST(req: Request) {
  if (!isRedisConfigured() || !isVapidConfigured()) {
    return NextResponse.json({ error: "Bildirim sunucusu yapılandırılmamış (README'deki kurulum adımlarına bak)." }, { status: 503 });
  }
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz kategori." }, { status: 400 });

  const record = await getNotificationRecord();
  if (!record) return NextResponse.json({ error: "Henüz bir bildirim aboneliği yok." }, { status: 400 });

  const settings = record.categories[parsed.data.category];
  const summary = await getSummary();
  const template = settings?.templates?.length ? pickRandomTemplate(settings.templates) : "Bu bir test bildirimidir.";
  const body = summary ? interpolateTemplate(template, summary) : template;

  const result = await sendPush(record.subscription, { title: `MertOS — ${CATEGORY_LABEL[parsed.data.category]} (test)`, body, tag: "test", url: "/bugun" });
  if (result.expired) return NextResponse.json({ error: "Abonelik geçersiz — tarayıcıda bildirimleri yeniden aç." }, { status: 410 });

  return NextResponse.json({ ok: true });
}
