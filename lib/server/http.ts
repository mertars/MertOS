import "server-only";
import { NextResponse } from "next/server";
import { DbNotConfiguredError } from "./db";

/** API route'larında ortak hata cevabı — yapılandırma eksikse 503, diğerlerinde 500. Çökme yok. */
export function errorResponse(e: unknown): NextResponse {
  if (e instanceof DbNotConfiguredError) {
    return NextResponse.json({ error: e.message, code: "db-yok" }, { status: 503 });
  }
  console.error("[mertos] API hatası:", e);
  return NextResponse.json({ error: "Sunucu hatası — veritabanına ulaşılamadı." }, { status: 500 });
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "bilinmiyor").trim();
}
