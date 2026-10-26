// Türkçe metin yardımcıları — FTS araması, tekrar not kontrolü ve
// "uydurma" kontrolleri için. Saf fonksiyonlar.

const TR_MAP: Record<string, string> = { ı: "i", ğ: "g", ü: "u", ş: "s", ö: "o", ç: "c", â: "a", î: "i", û: "u" };

/** Küçük harf + Türkçe karakterleri sadeleştirir + noktalamayı boşluğa çevirir. "Ispanaklı!" → "ispanakli" */
export function normalizeTr(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[ıǧğüşöçâîû]/g, (c) => TR_MAP[c] ?? c)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(
  "ve ile ama fakat icin gibi kadar daha cok az bir bu su o ben sen biz siz onlar mi mu mı mü ne neden nasil hangi var yok evet hayir bugun dun yarin simdi sonra once gun gunu acaba bana sana bende sende benim senin olur oldu olsun degil diye ise hem her hic bazi tum de da ki the".split(
    " ",
  ),
);

/** Anlamlı kelimeler (normalize, en az 3 harf, bağlaç değil). */
export function contentWords(text: string): string[] {
  return normalizeTr(text)
    .split(" ")
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

/**
 * Mesajdan FTS5 sorgusu üretir. Türkçe ekler yüzünden kelimeler en fazla 6
 * harfe kırpılıp önek araması yapılır ("yumurtayı" → yumurt*). Boşsa null.
 */
export function buildFtsQuery(text: string, maxTerms = 8): string | null {
  const terms = [...new Set(contentWords(text).map((w) => w.slice(0, 6)))].slice(0, maxTerms);
  if (terms.length === 0) return null;
  return terms.map((t) => `"${t}"*`).join(" OR ");
}

/**
 * İki metnin anlamlı kelime örtüşmesi (0–1), kısa olana göre. Tekrar not
 * kontrolü için. Kökler 4 harfle karşılaştırılır ki "sevmez"/"sevmiyor" aynı
 * sayılsın ("seviyor" ile "sevmiyor" ise ayrı kalır: "sevi" ≠ "sevm").
 */
export function wordOverlap(a: string, b: string): number {
  const wa = new Set(contentWords(a).map((w) => w.slice(0, 4)));
  const wb = new Set(contentWords(b).map((w) => w.slice(0, 4)));
  if (wa.size === 0 || wb.size === 0) return 0;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return common / Math.min(wa.size, wb.size);
}

/** Cümlelere böler (., !, ? sonrası). */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?…])\s+/)
    .filter(Boolean);
}

export const TR_MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

/** "2026-10-24" → "24 Ekim" */
export function formatTrDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${TR_MONTHS[m - 1]}`;
}
