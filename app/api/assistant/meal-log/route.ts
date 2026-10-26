import { NextResponse } from "next/server";
import { z } from "zod";
import { addDays, istanbulNow } from "@/lib/assistant/time";
import { addMealLog, deleteMealLog, listMealLog, updateMealLog } from "@/lib/server/assistant-repo";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";

const bodySchema = z.object({
  mealType: z.enum(["kahvalti", "ogle", "aksam"]),
  mealId: z.string().nullable(),
  mealName: z.string().trim().min(1).max(120),
  isLeftover: z.boolean().default(false),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  repeat: z.boolean().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Hafızam > Yediği tarifler: son `?days=` gün (varsayılan 60, en fazla 365), yeniden eskiye. */
export async function GET(req: Request) {
  const raw = Number(new URL(req.url).searchParams.get("days") ?? 60);
  const days = Number.isInteger(raw) ? Math.min(365, Math.max(1, raw)) : 60;
  const today = istanbulNow().date;
  try {
    const rows = await listMealLog(await getDb(), addDays(today, -(days - 1)), today);
    return NextResponse.json({ meals: rows.reverse() });
  } catch (e) {
    return errorResponse(e);
  }
}

const patchSchema = z
  .object({
    rating: z.number().int().min(1).max(5).nullable().optional(),
    repeat: z.boolean().optional(),
    restore: z.literal(true).optional(),
  })
  .refine((p) => p.rating !== undefined || p.repeat !== undefined || p.restore, "boş düzeltme");

/** Düzelt: puan / "tekrar yap"; `restore` silmeyi geri alır. */
export async function PATCH(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  try {
    await updateMealLog(await getDb(), id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  const today = istanbulNow().date;
  const date = parsed.data.date ?? today;
  if (date > today) return NextResponse.json({ error: "Gelecek bir güne kayıt yazılamaz." }, { status: 400 });
  try {
    const id = await addMealLog(await getDb(), { ...parsed.data, date });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return errorResponse(e);
  }
}

/** "Geri al" — kaydı yumuşak siler. */
export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Geçersiz kayıt." }, { status: 400 });
  try {
    await deleteMealLog(await getDb(), id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
