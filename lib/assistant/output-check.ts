import type { ChatMode } from "./persona";
import { normalizeTr, splitSentences, TR_MONTHS } from "./text";

// Çıktı kontrolü (§ 7.5) — ek model çağrısı olmadan, kodla:
// 1) uzunluk (ses: en fazla 3 cümle, liste yok; yazı: üst sınır)
// 2) hitap doğru mu
// 3) bağlamda olmayan bir tarih ya da "yediniz" denen kayıtsız bir yemek var mı
// Sorun 2 ya da 3 ise çağıran taraf en fazla 1 kez yeniden üretir.

export const MAX_CHARS: Record<ChatMode, number> = { ses: 360, yazi: 2200 };

/** Uzunluğu kırpar; ses modunda madde işaretlerini ve markdown'ı temizler. */
export function enforceLength(text: string, mode: ChatMode): string {
  let t = text.trim();
  if (mode === "ses") {
    t = t
      .replace(/^\s*([-*•]|\d+[.)])\s+/gm, "")
      .replace(/[*_#`]/g, "")
      .replace(/\n+/g, " ");
    t = splitSentences(t).slice(0, 3).join(" ");
  }
  if (t.length <= MAX_CHARS[mode]) return t;
  // Cümle sınırında kes
  const sentences = splitSentences(t);
  let out = "";
  for (const s of sentences) {
    if ((out + " " + s).trim().length > MAX_CHARS[mode]) break;
    out = (out + " " + s).trim();
  }
  return out || t.slice(0, MAX_CHARS[mode]).trimEnd() + "…";
}

/** Yanlış hitap: metinde "Mert" geçiyor ama ayarlı hitap biçiminde değil. */
export function hasWrongHitap(text: string, hitap: string): boolean {
  const withoutHitap = text.split(hitap).join(" ");
  if (/\bMert\b/.test(withoutHitap)) return true;
  if (!/\bBey\b/.test(hitap) && /\bMert Bey\b/.test(text)) return true;
  return false;
}

const MONTH_RE = new RegExp(`\\b(\\d{1,2})\\s+(${TR_MONTHS.join("|")})\\b`, "gi");

/** Cevaptaki açık tarihler ("24 Ekim", "2026-10-24", "24.10") — bağlamda geçmeyenler. */
export function findUnknownDates(text: string, context: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(MONTH_RE)) found.add(`${Number(m[1])} ${m[2].toLocaleLowerCase("tr-TR")}`);
  const ctx = context.toLocaleLowerCase("tr-TR");
  const unknown: string[] = [];
  for (const d of found) if (!ctx.includes(d)) unknown.push(d);
  for (const m of text.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)) if (!context.includes(m[0])) unknown.push(m[0]);
  return unknown;
}

const PAST_EAT = /(yedin|yemistin|yemissin|yaptin|yapmistin|pisirdin|pisirmistin|yedik|yemistik)/;

/**
 * Bilinen bir yemek adı "yediniz/yaptınız" gibi geçmiş zamanlı bir cümlede
 * geçiyor ama bağlamdaki kayıtlarda yoksa → uydurma şüphesi.
 */
export function findUnverifiedMeals(text: string, knownMealNames: string[], context: string): string[] {
  const ctx = normalizeTr(context);
  const out: string[] = [];
  for (const sentence of splitSentences(text)) {
    const s = normalizeTr(sentence);
    if (!PAST_EAT.test(s)) continue;
    for (const name of knownMealNames) {
      const n = normalizeTr(name);
      if (n.length >= 3 && s.includes(n) && !ctx.includes(n)) out.push(name);
    }
  }
  return [...new Set(out)];
}

export interface CheckResult {
  text: string;
  problems: string[];
}

export function checkOutput(params: { text: string; mode: ChatMode; hitap: string; context: string; knownMealNames: string[] }): CheckResult {
  const text = enforceLength(params.text, params.mode);
  const problems: string[] = [];
  if (hasWrongHitap(text, params.hitap)) problems.push(`Hitap yanlış: her zaman "${params.hitap}" de.`);
  const dates = findUnknownDates(text, params.context);
  if (dates.length) problems.push(`Kayıtta olmayan tarih söyledin (${dates.join(", ")}). Sadece VERİ'deki tarihleri kullan.`);
  const meals = findUnverifiedMeals(text, params.knownMealNames, params.context);
  if (meals.length) problems.push(`Kayıtta olmayan yemek söyledin (${meals.join(", ")}). Kayıt yoksa "kaydımda bulamadım" de.`);
  return { text, problems };
}
