import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSessionToken, getAuthConfig, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { clientIp, errorResponse } from "@/lib/server/http";
import { checkLoginAllowed, recordLoginAttempt } from "@/lib/server/login-guard";

const bodySchema = z.object({ password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const config = getAuthConfig();
  if (!config) return NextResponse.json({ error: "Giriş yapılandırılmamış." }, { status: 503 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Şifre boş olamaz." }, { status: 400 });

  try {
    const db = await getDb();
    const ip = clientIp(req);
    const guard = await checkLoginAllowed(db, ip);
    if (!guard.allowed) {
      const minutes = Math.max(1, Math.ceil(guard.retryAfterSec / 60));
      return NextResponse.json(
        { error: `Çok fazla yanlış deneme. ${minutes} dakika sonra tekrar dene.` },
        { status: 429, headers: { "Retry-After": String(guard.retryAfterSec) } },
      );
    }

    const ok = await bcrypt.compare(parsed.data.password, config.passwordHash);
    await recordLoginAttempt(db, ip, ok);
    if (!ok) return NextResponse.json({ error: "Şifre yanlış." }, { status: 401 });

    const { token, expiresAt } = await createSessionToken(config);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
