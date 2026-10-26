import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function capture(env: Record<string, string>) {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const seen: { url: string; headers: Record<string, string> }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    seen.push({ url, headers: init.headers as Record<string, string> });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), { status: 200 });
  });
  const { callGemini } = await import("./gemini");
  const r = await callGemini({ models: ["m"], system: "s", contents: [{ role: "user", text: "x" }], maxOutputTokens: 10 });
  return { r, seen };
}

describe("Gemini anahtar güvenliği", () => {
  it("anahtar URL'de değil başlıkta gider", async () => {
    const { seen } = await capture({ GEMINI_API_KEY: "ANAHTAR123" });
    expect(seen[0].url).not.toContain("ANAHTAR123");
    expect(seen[0].headers["x-goog-api-key"]).toBe("ANAHTAR123");
    expect(seen[0].url.startsWith("https://generativelanguage.googleapis.com/")).toBe(true);
  });
  it("Vercel'de GEMINI_API_BASE yok sayılır — anahtar başka adrese gidemez", async () => {
    const { seen } = await capture({ GEMINI_API_KEY: "k", VERCEL: "1", GEMINI_API_BASE: "https://kotu-niyetli.example/models" });
    expect(seen[0].url.startsWith("https://generativelanguage.googleapis.com/")).toBe(true);
  });
  it("anahtar yoksa hiç istek atılmaz", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { r, seen } = await capture({});
    expect(r.ok).toBe(false);
    expect(seen.length).toBe(0);
  });
});

describe("Gemini düşünme ayarı ve kesilme", () => {
  async function run(responses: { status: number; body: object }[]) {
    vi.stubEnv("GEMINI_API_KEY", "k");
    const bodies: { generationConfig: { thinkingConfig?: { thinkingLevel: string } } }[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(init.body as string));
      const r = responses[Math.min(bodies.length - 1, responses.length - 1)];
      return new Response(JSON.stringify(r.body), { status: r.status });
    });
    const { callGemini } = await import("./gemini");
    const r = await callGemini({ models: ["m"], system: "s", contents: [{ role: "user", text: "x" }], maxOutputTokens: 10 });
    return { r, bodies };
  }

  it("düşünme düzeyini düşük ister (bütçe cevaba kalsın)", async () => {
    const { r, bodies } = await run([{ status: 200, body: { candidates: [{ content: { parts: [{ text: "ok" }] }, finishReason: "STOP" }] } }]);
    expect(bodies[0].generationConfig.thinkingConfig).toEqual({ thinkingLevel: "low" });
    expect(r).toEqual({ ok: true, text: "ok", model: "m" });
  });
  it("MAX_TOKENS ile biten cevabı 'kesildi' işaretler", async () => {
    const { r } = await run([{ status: 200, body: { candidates: [{ content: { parts: [{ text: "yarım" }] }, finishReason: "MAX_TOKENS" }] } }]);
    expect(r.ok && r.truncated).toBe(true);
  });
  it("model düşünme düzeyini desteklemiyorsa ayarsız bir kez daha dener", async () => {
    const { r, bodies } = await run([
      { status: 400, body: { error: { code: 400, message: "Thinking level LOW is not supported for this model." } } },
      { status: 200, body: { candidates: [{ content: { parts: [{ text: "ok" }] } }] } },
    ]);
    expect(bodies.length).toBe(2);
    expect(bodies[1].generationConfig.thinkingConfig).toBeUndefined();
    expect(r.ok).toBe(true);
  });
});

describe("Gemini sesi (TTS)", () => {
  async function tts(responses: { status: number; body: object }[]) {
    vi.stubEnv("GEMINI_API_KEY", "k");
    const urls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      urls.push(url);
      const r = responses[Math.min(urls.length - 1, responses.length - 1)];
      return new Response(JSON.stringify(r.body), { status: r.status });
    });
    const { callGeminiTts } = await import("./gemini");
    return { r: await callGeminiTts("Merhaba", ["a-tts", "b-tts"], "Kore"), urls };
  }
  const audio = (mimeType: string, bytes: number[]) => ({
    candidates: [{ content: { parts: [{ inlineData: { mimeType, data: Buffer.from(bytes).toString("base64") } }] } }],
  });

  it("ham PCM'i 44 baytlık WAV başlığıyla sarar", async () => {
    const { r } = await tts([{ status: 200, body: audio("audio/L16;codec=pcm;rate=24000", [1, 0, 2, 0]) }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const head = new TextDecoder().decode(r.wav.slice(0, 4));
    const view = new DataView(r.wav.buffer);
    expect(head).toBe("RIFF");
    expect(view.getUint32(24, true)).toBe(24000);
    expect(r.wav.length).toBe(48);
  });
  it("WAV gelirse olduğu gibi geçirir", async () => {
    const { r } = await tts([{ status: 200, body: audio("audio/wav", [82, 73, 70, 70]) }]);
    expect(r.ok && Array.from(r.wav)).toEqual([82, 73, 70, 70]);
  });
  it("kota dolarsa sıradaki modele geçer; anahtar URL'de gitmez", async () => {
    const { r, urls } = await tts([
      { status: 429, body: { error: { message: "quota" } } },
      { status: 200, body: audio("audio/wav", [1]) },
    ]);
    expect(r.ok && r.model).toBe("b-tts");
    expect(urls.every((u) => !u.includes("k@") && !u.includes("key="))).toBe(true);
  });
  it("anahtar yoksa istek atmadan yapılandırma hatası", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { callGeminiTts } = await import("./gemini");
    expect(await callGeminiTts("x", ["a"], "Kore")).toMatchObject({ ok: false, reason: "yapilandirma" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
