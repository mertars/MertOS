import { NextResponse } from "next/server";
import { z } from "zod";
import { istanbulNow } from "@/lib/assistant/time";
import { addMealLog, deleteMealLog } from "@/lib/server/assistant-repo";
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
