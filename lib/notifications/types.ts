import type { NotificationCategory, NotificationCategorySettings, PersistenceLevel } from "@/lib/db/types";

export type { NotificationCategory, NotificationCategorySettings, PersistenceLevel };

/** Sunucuya senkronize edilen küçük sayısal özet — HAM KİŞİSEL VERİ DEĞİL, sadece
 * bildirim metinlerinde kullanılacak değişkenler (bkz. görev tanımı § 9). */
export interface NotificationSummary {
  isim: string;
  su_kalan: number;
  sigara_bugun: number;
  sigara_limit: number;
  son_sigara: string;
  seri: number;
  siradaki_antrenman: string;
  protein_kalan: number;
  updatedAt: string;
}

export interface NotificationServerRecord {
  subscription: PushSubscriptionJSON;
  quietHoursStart: string;
  quietHoursEnd: string;
  categories: Record<NotificationCategory, NotificationCategorySettings>;
  updatedAt: string;
}

export interface SentLog {
  [category: string]: string[]; // bugüne ait ISO gönderim zamanları
}

export const ALL_CATEGORIES: NotificationCategory[] = [
  "su",
  "antrenman",
  "sigara",
  "uyku",
  "beslenme",
  "gorevler",
  "aliskanliklar",
  "haftalik_rapor",
  "koc",
];

export const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  su: "Su",
  antrenman: "Antrenman",
  sigara: "Sigara",
  uyku: "Uyku",
  beslenme: "Beslenme",
  gorevler: "Görevler",
  aliskanliklar: "Alışkanlıklar",
  haftalik_rapor: "Haftalık Rapor",
  koc: "Koç",
};
