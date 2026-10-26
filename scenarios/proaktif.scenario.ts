import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { describe, it } from "vitest";
import { slotTimes, type ProactiveSlot } from "@/lib/assistant/proactive";
import { updateSettings } from "@/lib/server/assistant-repo";
import { prepareDatabase } from "@/lib/server/db-core";
import { callGemini, type LlmFn } from "@/lib/server/gemini";
import { getDailyBrief } from "@/lib/server/assistant-repo";
import { handleProactive } from "@/lib/server/proactive";
import { seedFixture } from "./fixture";

// Planlı konuşma (Faz 4) — GERÇEK Gemini ile her an için bir cümle üretir ve
// scenarios/sonuclar/proaktif-<zaman>.md'ye yazar (depoya girmez). Bugün:
// 2026-10-26 Pazartesi (koşu günü), senaryo seti verisiyle.
// Çalıştırma: npm run senaryo -- scenarios/proaktif.scenario.ts

const CASES: { slot: ProactiveSlot; hitap: string }[] = [
  { slot: "sabah", hitap: "Mert Bey" },
  { slot: "spor", hitap: "Mert Bey" },
  { slot: "kahvalti", hitap: "Mert Bey" },
  { slot: "ogle", hitap: "Mert Bey" },
  { slot: "ogle", hitap: "Kaptan" },
  { slot: "aksam", hitap: "Mert Bey" },
  { slot: "temizlik", hitap: "Mert Bey" },
  { slot: "proje", hitap: "Mert Bey" },
];

describe("Planlı konuşma — gerçek Gemini", () => {
  it("her an için cümle", async () => {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY yok.");
    const rows: string[] = [];
    for (const c of CASES) {
      const dir = mkdtempSync(join(tmpdir(), "mertos-proaktif-"));
      const db = createClient({ url: `file:${join(dir, "p.db")}` });
      try {
        const { ftsAvailable } = await prepareDatabase(db);
        await seedFixture(db, ftsAvailable);
        await updateSettings(db, { hitap: c.hitap });
        const time = slotTimes(await getDailyBrief(db, "2026-10-26", "05:00")).find((s) => s.slot === c.slot)!.time;
        const [h, m] = time.split(":").map(Number);
        const now = new Date(Date.UTC(2026, 9, 26, h - 3, m + 2));
        let detail = "";
        const llm: LlmFn = async (req) => {
          const r = await callGemini(req);
          detail = r.ok ? `model: ${r.model}` : `hata: ${r.reason}`;
          return r;
        };
        const started = Date.now();
        const r = await handleProactive({ db, llm, fts: ftsAvailable, now }, c.slot);
        const text = r.message ? r.message.content : `(söylenmedi: ${"reason" in r ? r.reason : ""})`;
        rows.push(`| ${c.slot} ${time} | ${c.hitap} | ${"via" in r ? r.via : "-"} | ${text.replace(/\|/g, "\\|")} | ${detail} · ${Date.now() - started} ms |`);
      } finally {
        db.close();
        rmSync(dir, { recursive: true, force: true });
      }
      await new Promise((res) => setTimeout(res, 3000));
    }
    const out = ["# Planlı konuşma — gerçek Gemini", "", "| An | Hitap | Kaynak | Cümle | Model |", "|---|---|---|---|---|", ...rows].join("\n");
    mkdirSync("scenarios/sonuclar", { recursive: true });
    const file = `scenarios/sonuclar/proaktif-${new Date().toISOString().replace(/[:.]/g, "-")}.md`;
    writeFileSync(file, out);
    console.log(out);
  });
});
