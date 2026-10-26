import { normalizeTr, TR_MONTHS } from "./text";
import { addDays, isoWeekday } from "./time";

// Mesajdaki göreli gün ifadelerini koddan kesin tarihe çevirir ("dün",
// "2 gün önce", "geçen salı"…). Böylece "2 gün önce ne yedim?" sorusunun
// cevabı veritabanından bulunup bağlama hazır konur — model tarih hesaplamaz.

const NUMBER_WORDS: Record<string, number> = {
  bir: 1,
  iki: 2,
  uc: 3,
  dort: 4,
  bes: 5,
  alti: 6,
  yedi: 7,
  sekiz: 8,
  dokuz: 9,
  on: 10,
};

const WEEKDAYS: Record<string, number> = {
  pazartesi: 1,
  sali: 2,
  carsamba: 3,
  persembe: 4,
  cuma: 5,
  cumartesi: 6,
  pazar: 7,
};

/** "N gün önce" için en fazla bu kadar geriye bakılır (açık tarihler sınırsız — kayıt yoksa "kayıt yok" denir). */
export const MAX_LOOKBACK_DAYS = 30;

export function parseDayReferences(message: string, today: string): string[] {
  const t = ` ${normalizeTr(message)} `;
  const out = new Set<string>();

  if (/ bugun/.test(t)) out.add(today);
  // "dünden önceki gün", "evvelki gün", "önceki gün" → 2 gün önce (önce bunlara bak, "dün" ile karışmasın)
  if (/ (dunden onceki gun|evvelki gun|evvelsi gun|onceki gun)/.test(t)) out.add(addDays(today, -2));
  else if (/ dun(ku|kunu|u|den)?\b/.test(t)) out.add(addDays(today, -1));

  for (const m of t.matchAll(/ (\d{1,2}|bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on) gun (once|evvel)/g)) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1]];
    if (n >= 1 && n <= MAX_LOOKBACK_DAYS) out.add(addDays(today, -n));
  }
  if (/ (bir hafta|1 hafta) once/.test(t)) out.add(addDays(today, -7));

  // Hafta günü adı: "salı", "geçen cuma", "pazartesi günü". En yakın GEÇMİŞ o gün
  // (bugün o günse ve "geçen" denmediyse bugün).
  const todayWd = isoWeekday(today);
  for (const [name, wd] of Object.entries(WEEKDAYS)) {
    // "pazar" kelimesi "pazartesi"nin içinde — tam kelime eşleşmesi
    const re = new RegExp(` (gecen )?${name}( gunu| gunku| aksam| sabah| ogle)?[ ]`);
    const m = t.match(re);
    if (!m) continue;
    let back = (todayWd - wd + 7) % 7;
    if (back === 0 && m[1]) back = 7;
    out.add(addDays(today, -back));
  }

  // Açık tarih: "15 Eylül", "3 ekim'de" → bu yılın o günü; gelecekteyse geçen yılın.
  const months = TR_MONTHS.map((m) => normalizeTr(m));
  for (const m of t.matchAll(new RegExp(` (\\d{1,2}) (${months.join("|")})`, "g"))) {
    const day = Number(m[1]);
    const month = months.indexOf(m[2]) + 1;
    let year = Number(today.slice(0, 4));
    const pad = (n: number) => String(n).padStart(2, "0");
    let date = `${year}-${pad(month)}-${pad(day)}`;
    if (date > today) date = `${--year}-${pad(month)}-${pad(day)}`;
    if (!Number.isNaN(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).getUTCDate() === day) out.add(date);
  }

  return [...out].sort();
}
