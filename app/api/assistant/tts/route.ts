import { z } from "zod";
import { NextResponse } from "next/server";
import { TTS_MAX_CHARS, TTS_MODELS, TTS_VOICE } from "@/lib/assistant/config";
import { getDb } from "@/lib/server/db";
import { callGeminiTts } from "@/lib/server/gemini";
import { errorResponse } from "@/lib/server/http";
import { consumeDailyCall, dailyLimitFromEnv } from "@/lib/server/usage-guard";

// Gemini sesi (Faz 4). Başarısızsa istemci tarayıcının hazır sesine döner;
// burada yalnızca net bir hata kodu verilir. Her çağrı günlük sınıra sayılır.

const bodySchema = z.object({ text: z.string().trim().min(1).max(TTS_MAX_CHARS) });

const STATUS = { kota: 429, ag: 502, yapilandirma: 503, hata: 502 } as const;

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz metin." }, { status: 400 });
  try {
    if (!(await consumeDailyCall(await getDb(), dailyLimitFromEnv()))) {
      return NextResponse.json({ error: "Günlük sınır doldu.", code: "kota" }, { status: 429 });
    }
    const r = await callGeminiTts(parsed.data.text, TTS_MODELS, TTS_VOICE);
    if (!r.ok) return NextResponse.json({ error: "Gemini sesi alınamadı.", code: r.reason }, { status: STATUS[r.reason] });
    return new Response(Buffer.from(r.wav), { headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
