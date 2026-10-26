import { addDays, isoWeekday } from "./time";
import { normalizeTr } from "./text";

// Sohbetten yapılacak ekleme. Model, Mert bir öneriyi kabul edip günü belli
// olunca cevabının sonuna tek satır yazar:
//   [[YAPILACAK gün=bugün saat=20:00 başlık=20 dk hafif yürüyüş]]
// KOD bu satırı her durumda cevaptan siler, alanları doğrular ve yalnızca
// Mert'in son mesajı bir kabul/zaman bildiriyorsa ekler (model kendi kendine
// liste dolduramaz). Eklenen madde sohbette "Listeye ekledim" satırıyla
// görünür ve geri alınabilir.

export const TODO_MAX_DAYS_AHEAD = 30;

export interface TodoProposal {
  title: string;
  date: string;
  time: string | null;
}

const MARKER = /\[\[\s*YAPILACAK\b([^\]]*)\]\]/gi;
const WEEKDAYS: Record<string, number> = { pazartesi: 1, sali: 2, carsamba: 3, persembe: 4, cuma: 5, cumartesi: 6, pazar: 7 };

function resolveDay(raw: string, today: string): string | null {
  const d = normalizeTr(raw).replace(/\s+/g, "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  if (d === "bugun") return today;
  if (d === "yarin") return addDays(today, 1);
  if (d === "oburgun" || d === "yarindansonra") return addDays(today, 2);
  const wd = WEEKDAYS[d];
  if (wd) return addDays(today, (wd - isoWeekday(today) + 7) % 7);
  return null;
}

/** "20:00", "8:30", "20.00" → "20:00"; "-" / boş → null; geçersiz → undefined */
function resolveTime(raw: string | undefined): string | null | undefined {
  const t = (raw ?? "").trim();
  if (!t || t === "-" || /^yok$/i.test(t)) return null;
  const m = t.match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return undefined;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** Cevaptan işaret satır(lar)ını siler; ilk geçerli öneriyi döner. */
export function extractTodoMarker(text: string, today: string): { text: string; proposal: TodoProposal | null } {
  let proposal: TodoProposal | null = null;
  for (const m of text.matchAll(MARKER)) {
    if (proposal) break;
    const body = m[1];
    const day = body.match(/g[uü]n\s*=\s*(\S+)/i)?.[1];
    const time = resolveTime(body.match(/saat\s*=\s*(\S+)/i)?.[1]);
    const title = body
      .match(/ba[sş]l[iı]k\s*=\s*(.+)$/i)?.[1]
      ?.trim()
      .replace(/^["“']|["”']$/g, "");
    const date = day ? resolveDay(day, today) : null;
    if (!date || date < today || date > addDays(today, TODO_MAX_DAYS_AHEAD) || time === undefined || !title || title.length < 2 || title.length > 80) continue;
    proposal = { title, date, time };
  }
  const clean = text
    .replace(MARKER, "")
    // Token sınırında yarım kalmış işaret satırı
    .replace(/\[\[\s*YAPILACAK[^\]]*$/i, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text: clean, proposal };
}

const REFUSAL = /\b(?:hayir|istemem|istemiyorum|olmaz|gerek yok|vazgec\w*|sonra bakarim|bos ver|bosver)\b/;
const ACCEPT = /\b(?:olur|tamam\w*|evet|ekle\w*|yaparim|yapayim|yapariz|peki|uygun|hadi|tabii|tabi|olsun|kabul|super|harika)\b/;
const TIME_CUE = /\b(?:\d{1,2}(?: \d{2})?(?: da| de| ta| te)?|saat\w*|aksam\w*|sabah\w*|ogle\w*|gece\w*|yarin\w*|bugun|pazartesi|sali|carsamba|persembe|cuma|cumartesi|pazar)\b/;

/** Mert'in mesajı bir öneriyi kabul ediyor ya da zaman veriyor mu? (Model kendi kendine eklemesin.) */
export function userAcceptedTodo(message: string): boolean {
  const t = normalizeTr(message);
  if (REFUSAL.test(t)) return false;
  return ACCEPT.test(t) || TIME_CUE.test(t);
}
