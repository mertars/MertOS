import { NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth/session";

/** Giriş ekranı için: şifre ve veritabanı ayarlandı mı? (Gizli bilgi döndürmez.) */
export async function GET() {
  return NextResponse.json({
    authConfigured: getAuthConfig() !== null,
    dbConfigured: Boolean(process.env.TURSO_DATABASE_URL),
  });
}
