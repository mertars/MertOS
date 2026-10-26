import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { describe, it } from "vitest";
import { hasWrongHitap } from "@/lib/assistant/output-check";
import { pickTone } from "@/lib/assistant/persona";
import { normalizeTr, splitSentences } from "@/lib/assistant/text";
import { updateSettings } from "@/lib/server/assistant-repo";
import { handleChat } from "@/lib/server/chat";
import { addMessage, createConversation } from "@/lib/server/chat-repo";
import { prepareDatabase } from "@/lib/server/db-core";
import { callGemini, type LlmFn } from "@/lib/server/gemini";
import { seedFixture } from "./fixture";
import { SCENARIOS } from "./scenarios";

// Senaryo setini GERÇEK Gemini ile çalıştırır ve sonuç tablosunu
// scenarios/sonuclar/<zaman>.md dosyasına yazar (§ 13 madde 2).
// Ücretsiz katman kotasını korumak için senaryolar arasında bekler; kota
// dolarsa durur ve o ana kadarki sonuçları yazar.

const WAIT_MS = Number(process.env.SENARYO_BEKLE_MS ?? 7000);
const ONLY = process.env.SENARYO_SADECE?.split(",").map(Number);

function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n+/g, "<br>");
}

describe("Gemini senaryo seti", () => {
  it("çalıştır ve raporla", async () => {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY yok — senaryolar gerçek Gemini ile çalışır.");
    // Model adları: ortamdan ezilebilir (ör. SENARYO_MODEL=gemini-flash-lite-latest)
    let calls = 0;
    const llm: LlmFn = async (req) => {
      calls++;
      const models = process.env.SENARYO_MODEL ? [process.env.SENARYO_MODEL] : req.models;
      return callGemini({ ...req, models });
    };

    const rows: string[] = [];
    let stoppedForQuota = false;
    for (const s of SCENARIOS.filter((x) => !ONLY || ONLY.includes(x.id))) {
      const dir = mkdtempSync(join(tmpdir(), "mertos-senaryo-"));
      const db = createClient({ url: `file:${join(dir, "s.db")}` });
      try {
        const { ftsAvailable } = await prepareDatabase(db);
        await seedFixture(db, ftsAvailable);
        const hitap = s.hitap ?? "Mert Bey";
        if (s.hitap) await updateSettings(db, { hitap: s.hitap });
        const [h, m] = s.time.split(":").map(Number);
        const now = new Date(Date.UTC(2026, 9, 26, h - 3, m));

        let conversationId: string | null = null;
        if (s.history?.length) {
          const c = await createConversation(db);
          conversationId = c.id;
          for (const text of s.history) {
            await addMessage(db, { conversationId, role: "user", content: text, mode: "yazi" });
            await addMessage(db, { conversationId, role: "assistant", content: "Anladım.", mode: "yazi" });
          }
        }

        const r = await handleChat({ db, llm, fts: ftsAvailable, now }, { conversationId, message: s.message, mode: s.mode });
        const reply = r.reply.content;
        const norm = normalizeTr(reply);
        const notes: string[] = [];
        if (r.failure) notes.push(`LLM HATASI: ${r.failure}`);
        if (s.expectAny && !s.expectAny.some((w) => norm.includes(normalizeTr(w)))) notes.push(`beklenen yok: ${s.expectAny.join("/")}`);
        const forbidden = (s.forbid ?? []).filter((w) => norm.includes(normalizeTr(w)));
        if (forbidden.length) notes.push(`yasak: ${forbidden.join(", ")}`);
        if (s.mode === "ses" && splitSentences(reply).length > 3) notes.push("ses: 3 cümleden uzun");
        if (r.regenerated) notes.push("1 kez yeniden üretildi");
        const hitapOk = !hasWrongHitap(reply, hitap);
        const fabricated = r.problems.filter((p) => !p.startsWith("Hitap")).length > 0;
        const tone = pickTone(s.time, s.message);
        rows.push(
          `| ${s.id} | ${cell(s.title)} | ${s.mode} ${s.time} · ${tone === "koc" ? "koç" : "arkadaş"}${s.tone && s.tone !== tone ? " ⚠️" : ""} | ${cell(s.message)} | ${cell(reply)} | ${reply.length} / ${splitSentences(reply).length} | ${hitapOk ? "✅" : "❌"} | ${fabricated ? "⚠️ " + cell(r.problems.join(" ")) : "—"} | ${cell(notes.join("; ") || "—")} |  |`,
        );
        if (r.failure === "kota") {
          stoppedForQuota = true;
          break;
        }
      } finally {
        db.close();
        rmSync(dir, { recursive: true, force: true });
      }
      await new Promise((res) => setTimeout(res, WAIT_MS));
    }

    const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
    const out = [
      `# Senaryo sonuçları — ${stamp}`,
      "",
      `Model çağrısı: ${calls}${stoppedForQuota ? " · ⚠️ KOTA DOLDU, set yarıda kaldı" : ""}${process.env.SENARYO_MODEL ? ` · model: ${process.env.SENARYO_MODEL}` : ""}`,
      "",
      "Son sütun (Mert): kötü cevapları ❌ ile işaretle, istersen kısa not yaz.",
      "",
      "| # | Senaryo | Mod · saat · ton | Mesaj | Cevap | Uzunluk (karakter / cümle) | Hitap | Uydurma? | Otomatik kontrol | Mert |",
      "|---|---|---|---|---|---|---|---|---|---|",
      ...rows,
      "",
    ].join("\n");
    mkdirSync(join(process.cwd(), "scenarios/sonuclar"), { recursive: true });
    const file = join(process.cwd(), `scenarios/sonuclar/${stamp}.md`);
    writeFileSync(file, out);
    console.log(`\nRapor: ${file}`);
  });
});
