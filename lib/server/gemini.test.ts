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
