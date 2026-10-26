import { NextResponse } from "next/server";
import { z } from "zod";
import { getSettings, updateSettings } from "@/lib/server/assistant-repo";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";

const patchSchema = z
  .object({
    hitap: z.string().trim().min(1).max(40),
    efekt: z.enum(["tam", "orta", "dusuk", "kapali"]),
    arka: z.enum(["dalga", "toz"]),
    sesliOkuma: z.boolean(),
    proaktif: z.boolean(),
    ses: z.enum(["tarayici", "gemini"]),
    blokDk: z.number().int().min(15).max(120),
    gunlukBlok: z.number().int().min(1).max(16),
    sinavHaftasiDers: z.boolean(),
  })
  .partial();

export async function GET() {
  try {
    return NextResponse.json(await getSettings(await getDb()));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request) {
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz ayar." }, { status: 400 });
  try {
    return NextResponse.json(await updateSettings(await getDb(), parsed.data));
  } catch (e) {
    return errorResponse(e);
  }
}
