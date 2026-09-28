import "server-only";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

export function isCoachConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface CoachChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskCoachResult {
  ok: boolean;
  reply?: string;
  error?: string;
}

export async function askCoach(system: string, messages: CoachChatMessage[], maxTokens = 700): Promise<AskCoachResult> {
  if (!isCoachConfigured()) return { ok: false, error: "AI Koç yapılandırılmamış (ANTHROPIC_API_KEY eksik)." };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Anthropic API hatası (${res.status}): ${body.slice(0, 200)}` };
    }

    const json = await res.json();
    const text = Array.isArray(json.content) ? json.content.map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : "")).join("") : "";
    if (!text) return { ok: false, error: "Koç'tan boş yanıt geldi." };
    return { ok: true, reply: text.trim() };
  } catch {
    return { ok: false, error: "Koç'a ulaşılamadı — internet bağlantını kontrol et." };
  }
}
