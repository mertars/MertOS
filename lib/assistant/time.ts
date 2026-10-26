import { ASSISTANT_TIMEZONE } from "./config";

/** Türkiye saatine göre "şu an". Tüm tarih/gün tipi hesapları bunu kullanır — modele tarih sorulmaz. */
export interface LocalNow {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  time: string;
  /** ISO hafta günü: 1 = Pazartesi … 7 = Pazar */
  weekday: number;
}

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ASSISTANT_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function istanbulNow(at: Date = new Date()): LocalNow {
  const parts = Object.fromEntries(formatter.formatToParts(at).map((p) => [p.type, p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, time: `${parts.hour}:${parts.minute}`, weekday: isoWeekday(date) };
}

/** YYYY-MM-DD → ISO hafta günü (1 = Pazartesi). Saat diliminden bağımsız (UTC öğle üzerinden). */
export function isoWeekday(date: string): number {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

/** Haftanın Pazartesi'si (ISO hafta başı). */
export function weekStart(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

/** ISO hafta numarası — temizlik rotasyonu için. */
export function isoWeekNumber(date: string): number {
  const thursday = addDays(date, 4 - isoWeekday(date));
  const yearStart = `${thursday.slice(0, 4)}-01-01`;
  return Math.floor(daysBetween(yearStart, thursday) / 7) + 1;
}

export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00Z`));
}

const DAY_NAMES = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export function weekdayName(weekday: number): string {
  return DAY_NAMES[weekday] ?? "";
}
