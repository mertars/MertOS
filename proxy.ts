import { NextResponse, type NextRequest } from "next/server";
import {
  createSessionToken,
  getAuthConfig,
  SESSION_COOKIE,
  SESSION_REFRESH_DAYS,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/auth/session";

// Giriş kapısı: giriş yapılmadan hiçbir sayfa açılmaz, hiçbir API cevap vermez.
// Bkz. CLAUDE.md § 15.2.

const PUBLIC_PATHS = new Set(["/giris", "/offline", "/api/auth/login", "/api/auth/status"]);
/** Kendi doğrulamasını yapan uç noktalar (Vercel Cron → CRON_SECRET). */
const SELF_AUTH_PATHS = new Set(["/api/backup/weekly"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Bildirimler kapatıldı (görev dosyası § 15) — eski push uç noktaları kapalı.
  if (pathname.startsWith("/api/push/")) {
    return NextResponse.json({ error: "Bildirimler kapatıldı." }, { status: 410 });
  }

  if (PUBLIC_PATHS.has(pathname) || SELF_AUTH_PATHS.has(pathname)) return NextResponse.next();

  const isApi = pathname.startsWith("/api/");
  const config = getAuthConfig();
  if (!config) {
    if (isApi) return NextResponse.json({ error: "Giriş yapılandırılmamış." }, { status: 503 });
    return NextResponse.redirect(new URL("/giris", request.url));
  }

  const exp = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, config);
  if (exp === null) {
    if (isApi) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    const url = new URL("/giris", request.url);
    if (pathname !== "/") url.searchParams.set("sonra", pathname + search);
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  // Kayan oturum: süresi yarıya inen çerez sessizce yenilenir, Mert bir daha şifre girmez.
  if (exp * 1000 - Date.now() < SESSION_REFRESH_DAYS * 86_400_000) {
    const { token, expiresAt } = await createSessionToken(config);
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icons/|sw\\.js|swe-worker-|manifest\\.webmanifest|robots\\.txt|favicon\\.ico|icon\\.png).*)",
  ],
};
