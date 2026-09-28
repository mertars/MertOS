import { NextResponse } from "next/server";
import { z } from "zod";
import { isRedisConfigured, saveNotificationRecord } from "@/lib/notifications/server-store";
import { ALL_CATEGORIES } from "@/lib/notifications/types";

const categorySettingsSchema = z.object({
  enabled: z.boolean(),
  hours: z.array(z.string()),
  persistence: z.enum(["sakin", "normal", "israrci"]),
  templates: z.array(z.string()),
});

const bodySchema = z.object({
  subscription: z.record(z.string(), z.unknown()),
  quietHoursStart: z.string(),
  quietHoursEnd: z.string(),
  categories: z.record(z.string(), categorySettingsSchema),
});

export async function POST(req: Request) {
  if (!isRedisConfigured()) {
    return NextResponse.json({ error: "Bildirim sunucusu yapılandırılmamış (Upstash Redis eksik). README'ye bak." }, { status: 503 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek gövdesi.", issues: parsed.error.issues }, { status: 400 });
  }

  const missing = ALL_CATEGORIES.filter((c) => !(c in parsed.data.categories));
  if (missing.length > 0) {
    return NextResponse.json({ error: `Eksik kategoriler: ${missing.join(", ")}` }, { status: 400 });
  }

  await saveNotificationRecord({
    subscription: parsed.data.subscription as unknown as PushSubscriptionJSON,
    quietHoursStart: parsed.data.quietHoursStart,
    quietHoursEnd: parsed.data.quietHoursEnd,
    categories: parsed.data.categories as never,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
