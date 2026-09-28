import { NextResponse } from "next/server";
import { clearSubscription, isRedisConfigured } from "@/lib/notifications/server-store";

/** Ayarlar > Bildirimler'deki ana anahtar kapatıldığında sunucudaki kaydı siler. */
export async function POST() {
  if (!isRedisConfigured()) {
    return NextResponse.json({ error: "Bildirim sunucusu yapılandırılmamış." }, { status: 503 });
  }
  await clearSubscription();
  return NextResponse.json({ ok: true });
}
