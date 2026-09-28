import type { NotificationCategorySettings } from "@/lib/db/types";

/** "HH:mm" -> gece yarısından bu yana geçen dakika. */
export function minutesSinceMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function isWithinQuietHours(nowHHMM: string, quietStart: string, quietEnd: string): boolean {
  const now = minutesSinceMidnight(nowHHMM);
  const start = minutesSinceMidnight(quietStart);
  const end = minutesSinceMidnight(quietEnd);
  if (start === end) return false;
  if (start < end) return now >= start && now < end;
  return now >= start || now < end; // gece yarısını geçen aralık (örn. 23:30-05:45)
}

const SLOT_TOLERANCE_MIN = 3; // tick ~5 dk'da bir çalışır, ±3 dk tolerans
const ISRARCI_REPEAT_HOURS = 2;
const ISRARCI_MAX_PER_DAY = 6;

export interface FireDecisionInput {
  nowHHMM: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  settings: NotificationCategorySettings;
  /** Bugün bu kategori için daha önce gönderilmiş "HH:mm" zamanları (aynı gün). */
  sentTimesToday: string[];
  /** Kategoriye özgü "hedef zaten tutturuldu mu" bilgisi — bilinmiyorsa null. */
  goalMet: boolean | null;
}

function isNearAnyConfiguredHour(nowMin: number, hours: string[]): boolean {
  return hours.some((h) => Math.abs(nowMin - minutesSinceMidnight(h)) <= SLOT_TOLERANCE_MIN);
}

function alreadySentNear(nowMin: number, sentTimesToday: string[]): boolean {
  return sentTimesToday.some((t) => Math.abs(nowMin - minutesSinceMidnight(t)) <= SLOT_TOLERANCE_MIN);
}

/** Bir kategori için şu an bildirim gönderilmeli mi? Saf fonksiyon — test edilebilir. */
export function shouldFireNow(input: FireDecisionInput): boolean {
  const { settings } = input;
  if (!settings.enabled) return false;
  if (isWithinQuietHours(input.nowHHMM, input.quietHoursStart, input.quietHoursEnd)) return false;

  const nowMin = minutesSinceMidnight(input.nowHHMM);
  if (alreadySentNear(nowMin, input.sentTimesToday)) return false;

  const nearConfiguredHour = isNearAnyConfiguredHour(nowMin, settings.hours);

  if (settings.persistence === "sakin") {
    return nearConfiguredHour && input.sentTimesToday.length === 0;
  }

  if (settings.persistence === "normal") {
    return nearConfiguredHour && input.sentTimesToday.length < settings.hours.length;
  }

  // israrci: hedef tutmadıysa yapılandırılmış saatlerin YANINDA, ilave olarak
  // her ISRARCI_REPEAT_HOURS saatte bir tekrar eder (üst sınırlı).
  if (input.goalMet === true) return false;
  if (nearConfiguredHour) return true;
  if (input.sentTimesToday.length === 0 || input.sentTimesToday.length >= ISRARCI_MAX_PER_DAY) return false;
  const lastSentMin = minutesSinceMidnight(input.sentTimesToday[input.sentTimesToday.length - 1]);
  return nowMin - lastSentMin >= ISRARCI_REPEAT_HOURS * 60;
}
