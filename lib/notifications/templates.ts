import type { NotificationCategory, NotificationCategorySettings, PersistenceLevel } from "@/lib/db/types";
import type { NotificationSummary } from "./types";

export const TEMPLATE_VARIABLES = [
  "isim",
  "su_kalan",
  "sigara_bugun",
  "sigara_limit",
  "son_sigara",
  "seri",
  "siradaki_antrenman",
  "protein_kalan",
] as const;

const DEFAULT_HOURS: Record<NotificationCategory, string[]> = {
  su: ["10:00", "15:00", "19:00"],
  antrenman: ["06:00"],
  sigara: ["21:00"],
  uyku: ["22:00"],
  beslenme: ["13:00", "19:30"],
  gorevler: ["09:00"],
  aliskanliklar: ["20:00"],
  haftalik_rapor: ["20:00"],
  koc: ["08:00"],
};

const DEFAULT_TEMPLATES: Record<NotificationCategory, string[]> = {
  su: ["Mert, bugün {su_kalan} ml su eksik. Bir bardak kap.", "Su hedefine {su_kalan} ml kaldı, unutma!"],
  antrenman: ["{siradaki_antrenman} yaklaşıyor. Ayakkabılar hazır mı?", "Bugünkü antrenman seni bekliyor 💪"],
  sigara: ["Bugün {sigara_bugun}/{sigara_limit} sigara içtin. Son sigaradan beri {son_sigara}.", "Bir sigara yerine bir bardak su dener misin?"],
  uyku: ["Yarın erken kalkacaksın, yatma vaktin yaklaşıyor.", "İyi bir uyku, iyi bir antrenmanın temeli."],
  beslenme: ["Protein hedefine {protein_kalan} g kaldı.", "Bugün öğün eklemeyi unutma."],
  gorevler: ["Bugün için görevlerin seni bekliyor.", "Küçük bir görevi tamamlayarak günü bitir."],
  aliskanliklar: ["Bugünkü alışkanlıklarını işaretlemeyi unutma.", "Serin devam ediyor, bugün de kaçırma!"],
  haftalik_rapor: ["Haftalık raporun hazır! {seri} günlük serin nasıl gidiyor?", "Bu haftayı gözden geçirme vakti."],
  koc: ["Koçundan bugün için 3 madde var.", "Sabah brifingini okumayı unutma."],
};

/** Ayarlar > Bildirimler'deki şablon önizlemesi için örnek özet verisi. */
export const SAMPLE_SUMMARY: NotificationSummary = {
  isim: "Mert",
  su_kalan: 500,
  sigara_bugun: 2,
  sigara_limit: 6,
  son_sigara: "14:20",
  seri: 12,
  siradaki_antrenman: "İnterval Koşusu",
  protein_kalan: 40,
  updatedAt: new Date().toISOString(),
};

export function defaultCategorySettings(category: NotificationCategory): NotificationCategorySettings {
  return {
    enabled: true,
    hours: DEFAULT_HOURS[category],
    persistence: "normal" as PersistenceLevel,
    templates: DEFAULT_TEMPLATES[category],
  };
}

export function pickRandomTemplate(templates: string[]): string {
  if (templates.length === 0) return "";
  return templates[Math.floor(Math.random() * templates.length)];
}

export function interpolateTemplate(template: string, summary: NotificationSummary): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = (summary as unknown as Record<string, unknown>)[key];
    return value != null ? String(value) : match;
  });
}
