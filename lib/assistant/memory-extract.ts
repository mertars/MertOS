import { z } from "zod";
import { contentWords, normalizeTr, wordOverlap } from "./text";

// Hafıza çıkarma (§ 7.3). Model (hafif) yalnızca öneri üretir; KOD süzer:
// - Not, Mert'in kendi mesajlarındaki kelimelere dayanmalı (çıkarım/tahmin yok)
// - Hassas kategoriler daha yüksek güven ister
// - Var olan bir notun tekrarıysa yazılmaz

export const MEMORY_CATEGORIES = ["yemek_tercihi", "tarif", "aliskanlik", "saglik", "kisisel", "diger"] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export const MEMORY_CATEGORY_LABELS: Record<MemoryCategory, string> = {
  yemek_tercihi: "Yemek tercihi",
  tarif: "Tarif",
  aliskanlik: "Alışkanlık",
  saglik: "Sağlık",
  kisisel: "Kişisel",
  diger: "Not",
};

const SENSITIVE: MemoryCategory[] = ["saglik", "kisisel"];

export const extractionSchema = z.object({
  notlar: z
    .array(
      z.object({
        kategori: z.enum(MEMORY_CATEGORIES),
        metin: z.string().min(3).max(200),
        guven: z.number().min(0).max(1),
      }),
    )
    .max(10),
});
export type ExtractedNote = z.infer<typeof extractionSchema>["notlar"][number];

/** Gemini'nin JSON modu için şema (OpenAPI alt kümesi). */
export const EXTRACTION_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    notlar: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          kategori: { type: "STRING", enum: [...MEMORY_CATEGORIES] },
          metin: { type: "STRING" },
          guven: { type: "NUMBER" },
        },
        required: ["kategori", "metin", "guven"],
      },
    },
  },
  required: ["notlar"],
};

export function buildExtractionPrompt(transcript: { role: "user" | "assistant"; content: string }[]): { system: string; user: string } {
  const system = `Bir sohbetten KALICI kişisel notlar çıkarıyorsun. Kurallar:
- YALNIZCA "Mert:" satırlarında Mert'in AÇIKÇA söylediği şeyleri yaz. Asistanın söylediklerinden not çıkarma.
- Çıkarım, tahmin, yorum YAPMA. Mert "ıspanağı sevmem" demediyse "ıspanağı sevmiyor" yazma.
- Kalıcı olanları al: yemek tercihleri (sevdiği/sevmediği, alerji), yaptığı tarif ve beğenisi, alışkanlıklar.
- Geçici durumları alma ("bugün yorgunum", "şu an acıktım").
- Sağlık, para ve kişisel konular: yalnızca Mert açıkça söylediyse ve kısa yaz.
- Her not kısa, tek cümle, üçüncü şahıs: "Ispanağı sevmiyor."
- guven: Mert bunu ne kadar açık söyledi (0–1).
- Not yoksa boş liste döndür.`;
  const user = transcript.map((m) => `${m.role === "user" ? "Mert" : "Asistan"}: ${m.content}`).join("\n");
  return { system, user };
}

/** Notun anlamlı kelimelerinin en az yarısı Mert'in mesajlarında geçmeli (kökler 5 harfle karşılaştırılır). */
export function isGroundedInUserText(note: string, userText: string): boolean {
  const userStems = new Set(contentWords(userText).map((w) => w.slice(0, 5)));
  const words = contentWords(note).map((w) => w.slice(0, 5));
  if (words.length === 0) return false;
  const hits = words.filter((w) => userStems.has(w)).length;
  return hits / words.length >= 0.5;
}

export function filterExtractedNotes(params: { notes: ExtractedNote[]; userText: string; existing: string[] }): ExtractedNote[] {
  const accepted: ExtractedNote[] = [];
  for (const n of params.notes) {
    const minConfidence = SENSITIVE.includes(n.kategori) ? 0.9 : 0.7;
    if (n.guven < minConfidence) continue;
    if (!isGroundedInUserText(n.metin, params.userText)) continue;
    const all = [...params.existing, ...accepted.map((a) => a.metin)];
    if (all.some((e) => normalizeTr(e) === normalizeTr(n.metin) || wordOverlap(e, n.metin) >= 0.8)) continue;
    accepted.push({ ...n, metin: n.metin.trim() });
  }
  return accepted;
}
