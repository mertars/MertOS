import "server-only";

// Gemini API (ücretsiz katman) — ek SDK bağımlılığı olmadan ham fetch.
// Anahtar yalnızca sunucuda: GEMINI_API_KEY. Model adları lib/assistant/config.ts.

export type LlmFailure = "yapilandirma" | "kota" | "ag" | "hata";

export type LlmResult =
  | { ok: true; text: string; model: string; /** Cevap token sınırında kesildi (finishReason MAX_TOKENS) */ truncated?: boolean }
  | { ok: false; reason: LlmFailure; detail: string };

export interface LlmRequest {
  /** Denenecek modeller sırayla: model bulunamazsa (404) ya da kotası dolarsa (429) sıradakine geçilir. */
  models: string[];
  system: string;
  contents: { role: "user" | "model"; text: string }[];
  maxOutputTokens: number;
  temperature?: number;
  /** JSON modu: Gemini cevabı bu şemaya uygun JSON olarak döndürür. */
  responseSchema?: object;
}

export type LlmFn = (req: LlmRequest) => Promise<LlmResult>;

const GOOGLE_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
/**
 * GEMINI_API_BASE yalnızca yerel uçtan uca testlerde sahte sunucuya
 * yönlendirmek için. Vercel'de (canlı/önizleme) YOK SAYILIR — yanlışlıkla
 * ayarlansa bile anahtar Google dışında bir adrese gönderilemez.
 */
const API_BASE = !process.env.VERCEL && process.env.GEMINI_API_BASE ? process.env.GEMINI_API_BASE : GOOGLE_API_BASE;
const TIMEOUT_MS = 25_000;
/**
 * Gemini 3 "düşünen" bir model: düşünme token'ları maxOutputTokens'tan yer.
 * Varsayılan düzeyde ses modunun 400 token'ının ~380'i düşünmeye gidip cevap
 * kelime ortasında kesiliyordu (senaryo turu, Ekim 2026). "low" yeterli.
 */
const THINKING_LEVEL = "low";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
}

export const callGemini: LlmFn = async (req) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, reason: "yapilandirma", detail: "GEMINI_API_KEY yok" };

  let last: LlmResult = { ok: false, reason: "hata", detail: "model listesi boş" };
  for (const model of req.models) {
    last = await callOnce(model, req, key);
    if (last.ok) return last;
    // Model yoksa ya da kotası dolduysa sıradaki modeli dene; diğer hatalarda dur.
    if (!(last.reason === "kota" || last.detail.startsWith("404"))) return last;
  }
  return last;
};

async function callOnce(model: string, req: LlmRequest, key: string, thinking = true): Promise<LlmResult> {
  const body = {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: req.contents.map((c) => ({ role: c.role, parts: [{ text: c.text }] })),
    generationConfig: {
      maxOutputTokens: req.maxOutputTokens,
      temperature: req.temperature ?? 0.7,
      ...(thinking ? { thinkingConfig: { thinkingLevel: THINKING_LEVEL } } : {}),
      ...(req.responseSchema ? { responseMimeType: "application/json", responseSchema: req.responseSchema } : {}),
    },
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    return { ok: false, reason: "ag", detail: e instanceof Error ? e.message : "ağ hatası" };
  }

  const data = (await res.json().catch(() => ({}))) as GeminiResponse;
  if (res.status === 429) return { ok: false, reason: "kota", detail: `429 ${data.error?.message ?? ""}` };
  // "-latest" takma adı düşünme düzeyini desteklemeyen bir modele geçerse ayarsız tekrar dene.
  if (res.status === 400 && thinking && /thinking/i.test(data.error?.message ?? "")) return callOnce(model, req, key, false);
  if (!res.ok) {
    const reason: LlmFailure = res.status >= 500 ? "ag" : "hata";
    console.error(`[mertos] Gemini ${model} ${res.status}:`, data.error?.message);
    return { ok: false, reason, detail: `${res.status} ${data.error?.message ?? ""}` };
  }

  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("")
    .trim();
  if (!text) {
    return { ok: false, reason: "hata", detail: `boş cevap (${candidate?.finishReason ?? data.promptFeedback?.blockReason ?? "?"})` };
  }
  return { ok: true, text, model, ...(candidate?.finishReason === "MAX_TOKENS" ? { truncated: true } : {}) };
}
