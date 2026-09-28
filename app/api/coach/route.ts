import { NextResponse } from "next/server";
import { z } from "zod";
import { askCoach, isCoachConfigured, type CoachChatMessage } from "@/lib/coach/anthropic";
import { buildCoachSystemPrompt, buildUserTurn } from "@/lib/coach/prompts";

const contextSchema = z.object({
  isim: z.string(),
  aralikGun: z.number(),
  skor: z.object({ seri: z.number() }),
  antrenman: z.object({ tamamlananSeans: z.number() }),
  su: z.object({ gunlukOrtalamaMl: z.number(), hedefMl: z.number() }),
  sigara: z.object({ gunlukOrtalama: z.number(), limit: z.number(), birakmaModu: z.boolean(), harcamaTl: z.number() }),
  uyku: z.object({ ortalamaDakika: z.number().nullable(), girisSayisi: z.number() }),
  beslenme: z.object({ ortalamaKcal: z.number().nullable(), ortalamaProteinG: z.number().nullable(), proteinHedefG: z.number() }),
  zihin: z.object({
    ortalamaMod: z.number().nullable(),
    ortalamaEnerji: z.number().nullable(),
    ortalamaStres: z.number().nullable(),
    gunlukSayisi: z.number(),
    minnettarlikSayisi: z.number(),
  }),
  uretkenlik: z.object({ tamamlananGorev: z.number(), odakDakika: z.number() }),
  finans: z.object({ gelir: z.number(), gider: z.number(), net: z.number() }),
  aliskanlik: z.object({ aktifSayi: z.number(), ortalamaTamamlanmaOrani: z.number().nullable() }),
});

const historyMessageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string() });

const bodySchema = z.object({
  kind: z.enum(["brifing", "haftalik_rapor", "sohbet", "program_onerisi"]),
  context: contextSchema,
  message: z.string().optional(),
  history: z.array(historyMessageSchema).max(20).optional(),
});

export async function POST(req: Request) {
  if (!isCoachConfigured()) {
    return NextResponse.json({ error: "AI Koç yapılandırılmamış (README'deki kurulum adımlarına bak)." }, { status: 503 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek gövdesi.", issues: parsed.error.issues }, { status: 400 });
  }
  const { kind, context, message, history } = parsed.data;
  if (kind === "sohbet" && !message?.trim()) {
    return NextResponse.json({ error: "Mesaj boş olamaz." }, { status: 400 });
  }

  const system = buildCoachSystemPrompt(context);
  const messages: CoachChatMessage[] = [...(history ?? []), { role: "user", content: buildUserTurn(kind, message) }];

  const result = await askCoach(system, messages);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ reply: result.reply });
}
