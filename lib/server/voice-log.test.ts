import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listMealLog, listRoutineLog } from "./assistant-repo";
import { handleChat } from "./chat";
import { prepareDatabase } from "./db-core";
import type { LlmFn } from "./gemini";

// Faz 4 § 4: "10 gerçek cümleyle dene, yanlış anlama oranını raporla". Cümleler
// telefondaki konuşma tanımanın verdiği biçimde (küçük harf, noktalamasız) yazıldı.
// Kayıt KODLA yapılır; model sahte (cevap metni burada önemsiz).

let dir: string;
let db: Client;
const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+03:00`);
const MON = "2026-10-26"; // koşu günü

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "mertos-ses-"));
  db = createClient({ url: `file:${join(dir, "s.db")}` });
  await prepareDatabase(db);
});
afterAll(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

const llm: LlmFn = async () => ({ ok: true, text: "Tamam Mert Bey.", model: "sahte" });

type Expect = { routine?: string[]; meal?: { mealType: string; mealName: string; rating?: number | null; note?: string | null } | null; asks?: boolean; nothing?: boolean; undoesMeal?: string };

const SENTENCES: { time: string; text: string; expect: Expect; date?: string }[] = [
  { time: "07:05", text: "sabah rutinimi yaptım soğuk duş da aldım", expect: { routine: ["uyanis", "buzlu_su", "hidrasyon", "soguk_dus"] } },
  { time: "07:45", text: "koşumu yaptım", expect: { routine: ["kosu"] } },
  { time: "08:30", text: "kahvaltıda iki yumurta ve peynir yedim", expect: { meal: { mealType: "kahvalti", mealName: "Yumurta ve peynir" } } },
  { time: "13:30", text: "öğlen menemen yedim 4 puan", expect: { meal: { mealType: "ogle", mealName: "Menemen", rating: 4 } } },
  { time: "13:31", text: "geri al", expect: { undoesMeal: "Menemen" } },
  { time: "19:45", text: "akşam yemeğinde tavuk sote yedim çok güzeldi", expect: { meal: { mealType: "aksam", mealName: "Tavuk sote", note: "çok güzeldi" } } },
  { time: "21:00", text: "bugün iki litre su içtim", expect: { routine: ["su"] } },
  { time: "21:05", text: "dün de koştum", expect: { routine: ["kosu"] }, date: "2026-10-25" },
  { time: "21:10", text: "yemeğimi yedim", expect: { asks: true } },
  { time: "21:15", text: "yarın sabah erken koşacağım", expect: { nothing: true } },
];

async function snapshot(date: string) {
  const routine = (await listRoutineLog(db, date, date)).filter((r) => r.done).map((r) => r.item as string);
  const meals = await listMealLog(db, date, date);
  return { routine, meals };
}

describe("10 gerçek cümle — sesle günlük kayıt", () => {
  it("hepsi doğru anlaşılır (yanlış anlama oranı raporlanır)", async () => {
    let conversationId: string | null = null;
    const wrong: string[] = [];
    for (const s of SENTENCES) {
      const date = s.date ?? MON;
      const before = await snapshot(date);
      const r = await handleChat({ db, llm, fts: false, now: at(MON, s.time) }, { conversationId, message: s.text, mode: "ses" });
      conversationId = r.conversationId;
      const after = await snapshot(date);
      const newRoutine = after.routine.filter((i) => !before.routine.includes(i));
      const newMeals = after.meals.filter((m) => !before.meals.some((b) => b.id === m.id));
      const gone = before.meals.filter((b) => !after.meals.some((m) => m.id === b.id));
      const e = s.expect;
      let ok = true;
      if (e.routine) ok = JSON.stringify([...newRoutine].sort()) === JSON.stringify([...e.routine].sort()) && newMeals.length === 0;
      if (e.meal) {
        const m = newMeals[0];
        ok =
          newMeals.length === 1 &&
          newRoutine.length === 0 &&
          m.mealType === e.meal.mealType &&
          m.mealName === e.meal.mealName &&
          (e.meal.rating === undefined || m.rating === e.meal.rating) &&
          (e.meal.note === undefined || (m.note ?? "").toLocaleLowerCase("tr-TR") === e.meal.note);
      }
      if (e.undoesMeal) ok = gone.length === 1 && gone[0].mealName === e.undoesMeal && r.undone !== null;
      if (e.asks) ok = newRoutine.length === 0 && newMeals.length === 0 && Boolean(r.reply.meta?.pending) && r.reply.content.endsWith("?");
      if (e.nothing) ok = newRoutine.length === 0 && newMeals.length === 0 && !r.marks;
      if (!ok) wrong.push(`${s.text} → yeni rutin ${JSON.stringify(newRoutine)}, yeni öğün ${JSON.stringify(newMeals.map((m) => [m.mealType, m.mealName, m.rating, m.note]))}, cevap "${r.reply.content}"`);
    }
    console.log(`Yanlış anlama: ${wrong.length}/${SENTENCES.length}${wrong.length ? `\n${wrong.join("\n")}` : ""}`);
    expect(wrong).toEqual([]);
  });

  it("soruya cevap: 'yemeğimi yedim' → soru → 'menemen' → akşama yazılır", async () => {
    const r1 = await handleChat({ db, llm, fts: false, now: at(MON, "21:20") }, { message: "yemeğimi yedim", mode: "ses" });
    expect(r1.reply.content).toBe("Mert Bey, akşam yemeğinde ne yediniz?");
    // Akşam zaten kayıtlı (tavuk sote) — yine de ikinci bir akşam öğünü yazılabilir; aynı yemek iki kez yazılmaz.
    const r2 = await handleChat({ db, llm, fts: false, now: at(MON, "21:21") }, { conversationId: r1.conversationId, message: "tavuk sote", mode: "ses" });
    expect(r2.reply.content).toBe("Mert Bey, bu zaten kayıtlı: akşam — tavuk sote.");
    const r3 = await handleChat({ db, llm, fts: false, now: at(MON, "21:22") }, { conversationId: r1.conversationId, message: "yemeğimi yedim", mode: "ses" });
    const r4 = await handleChat({ db, llm, fts: false, now: at(MON, "21:23") }, { conversationId: r3.conversationId, message: "yoğurt ve meyve", mode: "ses" });
    expect(r4.marks?.content).toBe("İşaretledim: akşam — yoğurt ve meyve");
    expect(r4.reply.content).toBe("Tamam Mert Bey, yazdım.");
  });
});
