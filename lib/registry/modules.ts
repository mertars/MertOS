import {
  Activity,
  Cigarette,
  Droplets,
  HeartPulse,
  Moon,
  Scale,
  UtensilsCrossed,
  Pill,
  Brain,
  Gauge,
  BookHeart,
  Sparkles,
  BookOpen,
  ListChecks,
  FolderKanban,
  Timer,
  CalendarClock,
  Wallet,
  PiggyBank,
  Receipt,
  Repeat,
  Target,
  Flag,
  CalendarDays,
  SunMoon,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { AppSettings } from "@/lib/db/types";

/**
 * MertOS Modül Kayıt Sistemi (Registry)
 * ---------------------------------------------------------------
 * Hub'lar grid'i, ana ekran özet kartları, Hızlı Ekle ve Ayarlar > Modüller
 * listesi BURADAN beslenir. Yeni bir modül eklemek için:
 *   1) MODULES dizisine bir ModuleDescriptor ekle (phase: 2 ile işaretle),
 *   2) route'un işaret ettiği sayfayı oluştur,
 *   3) (opsiyonel) Hızlı Ekle aksiyonu için lib/quick-add/actions.ts'e ekle.
 * Başka hiçbir yerde "if (modül var)" kontrolü yazmaya gerek yok — Hub'lar
 * ve Bugün ekranları sadece `enabled && phase <= mevcut aşama` olan
 * modülleri gösterir, geri kalanı otomatik gizlenir.
 */

export interface HubDescriptor {
  id: string;
  name: string;
  accentVar: `--color-${string}`;
  icon: LucideIcon;
}

export interface ModuleDescriptor {
  id: string;
  hubId: string;
  name: string;
  shortName: string;
  description: string;
  accentVar: `--color-${string}`;
  icon: LucideIcon;
  route: string;
  enabledByDefault: boolean;
  /** Bu modülün hangi geliştirme aşamasında tamamlandığı. UI şu an yalnızca phase 1'i gösterir. */
  phase: 1 | 2;
}

export const CURRENT_PHASE = 1;

export const HUBS: HubDescriptor[] = [
  { id: "beden", name: "Beden", accentVar: "--color-hareket", icon: Activity },
  { id: "beslenme", name: "Beslenme", accentVar: "--color-beslenme", icon: UtensilsCrossed },
  { id: "sigara", name: "Sigara", accentVar: "--color-sigara-temiz", icon: Cigarette },
  { id: "zihin", name: "Zihin", accentVar: "--color-zihin", icon: Brain },
  { id: "uretkenlik", name: "Üretkenlik", accentVar: "--color-uretkenlik", icon: ListChecks },
  { id: "finans", name: "Finans", accentVar: "--color-finans", icon: Wallet },
  { id: "aliskanlik", name: "Alışkanlık & Hedef", accentVar: "--color-uyku", icon: Target },
  { id: "takvim", name: "Takvim & Rutin", accentVar: "--color-su", icon: CalendarClock },
];

export const MODULES: ModuleDescriptor[] = [
  // --- 1. Aşama ---
  {
    id: "antrenman",
    hubId: "beden",
    name: "Antrenman & Kondisyon",
    shortName: "Antrenman",
    description: "Koşu, interval, kuvvet ve halısaha kayıtları, 8 haftalık program, kondisyon skoru.",
    accentVar: "--color-hareket",
    icon: Activity,
    route: "/hublar/beden/antrenman",
    enabledByDefault: true,
    phase: 1,
  },
  {
    id: "su",
    hubId: "beslenme",
    name: "Su",
    shortName: "Su",
    description: "Günlük su hedefi ve hızlı kayıt.",
    accentVar: "--color-su",
    icon: Droplets,
    route: "/hublar/beslenme/su",
    enabledByDefault: true,
    phase: 1,
  },
  {
    id: "sigara",
    hubId: "sigara",
    name: "Sigara",
    shortName: "Sigara",
    description: "Sayaç, azaltma planı, bırakma modu, sağlık kazanımları, para ve analiz.",
    accentVar: "--color-sigara",
    icon: Cigarette,
    route: "/hublar/sigara/takip",
    enabledByDefault: true,
    phase: 1,
  },

  // --- 2. Aşama (henüz UI'da görünmez — CLAUDE.md § Sonraki Adımlar) ---
  { id: "aktivite", hubId: "beden", name: "Aktivite", shortName: "Aktivite", description: "Adım ve aktif kalori.", accentVar: "--color-hareket", icon: Gauge, route: "/hublar/beden/aktivite", enabledByDefault: true, phase: 2 },
  { id: "kalp", hubId: "beden", name: "Kalp", shortName: "Kalp", description: "Dinlenik nabız, HRV, VO2max.", accentVar: "--color-kondisyon", icon: HeartPulse, route: "/hublar/beden/kalp", enabledByDefault: true, phase: 2 },
  { id: "uyku", hubId: "beden", name: "Uyku", shortName: "Uyku", description: "Uyku süresi ve kalitesi.", accentVar: "--color-uyku", icon: Moon, route: "/hublar/beden/uyku", enabledByDefault: true, phase: 2 },
  { id: "vucut", hubId: "beden", name: "Vücut", shortName: "Vücut", description: "Kilo, ölçüler, fotoğraf.", accentVar: "--color-hareket", icon: Scale, route: "/hublar/beden/vucut", enabledByDefault: true, phase: 2 },
  { id: "ogunler", hubId: "beslenme", name: "Öğünler", shortName: "Öğünler", description: "Kalori ve makro takibi.", accentVar: "--color-beslenme", icon: UtensilsCrossed, route: "/hublar/beslenme/ogunler", enabledByDefault: true, phase: 2 },
  { id: "takviyeler", hubId: "beslenme", name: "Takviyeler", shortName: "Takviye", description: "Günlük takviye kayıtları.", accentVar: "--color-beslenme", icon: Pill, route: "/hublar/beslenme/takviyeler", enabledByDefault: true, phase: 2 },
  { id: "ruh-hali", hubId: "zihin", name: "Ruh Hali & Enerji", shortName: "Ruh Hali", description: "Günlük mod ve enerji takibi.", accentVar: "--color-zihin", icon: Sparkles, route: "/hublar/zihin/ruh-hali", enabledByDefault: true, phase: 2 },
  { id: "stres", hubId: "zihin", name: "Stres", shortName: "Stres", description: "Stres seviyesi takibi.", accentVar: "--color-zihin", icon: Brain, route: "/hublar/zihin/stres", enabledByDefault: true, phase: 2 },
  { id: "gunluk", hubId: "zihin", name: "Günlük", shortName: "Günlük", description: "Serbest günlük yazıları.", accentVar: "--color-zihin", icon: BookHeart, route: "/hublar/zihin/gunluk", enabledByDefault: true, phase: 2 },
  { id: "minnettarlik", hubId: "zihin", name: "Minnettarlık", shortName: "Minnettarlık", description: "Günlük minnettarlık notları.", accentVar: "--color-zihin", icon: Star, route: "/hublar/zihin/minnettarlik", enabledByDefault: true, phase: 2 },
  { id: "okuma", hubId: "zihin", name: "Okuma", shortName: "Okuma", description: "Kitap takibi.", accentVar: "--color-zihin", icon: BookOpen, route: "/hublar/zihin/okuma", enabledByDefault: true, phase: 2 },
  { id: "gorevler", hubId: "uretkenlik", name: "Görevler", shortName: "Görevler", description: "Yapılacaklar listesi.", accentVar: "--color-uretkenlik", icon: ListChecks, route: "/hublar/uretkenlik/gorevler", enabledByDefault: true, phase: 2 },
  { id: "projeler", hubId: "uretkenlik", name: "Projeler", shortName: "Projeler", description: "Proje takibi.", accentVar: "--color-uretkenlik", icon: FolderKanban, route: "/hublar/uretkenlik/projeler", enabledByDefault: true, phase: 2 },
  { id: "odak", hubId: "uretkenlik", name: "Odak", shortName: "Odak", description: "Pomodoro odak seansları.", accentVar: "--color-uretkenlik", icon: Timer, route: "/hublar/uretkenlik/odak", enabledByDefault: true, phase: 2 },
  { id: "gelir-gider", hubId: "finans", name: "Gelir-Gider", shortName: "Gelir-Gider", description: "Gelir ve gider takibi.", accentVar: "--color-finans", icon: Receipt, route: "/hublar/finans/gelir-gider", enabledByDefault: true, phase: 2 },
  { id: "butce", hubId: "finans", name: "Bütçe", shortName: "Bütçe", description: "Kategori bazlı bütçe.", accentVar: "--color-finans", icon: Wallet, route: "/hublar/finans/butce", enabledByDefault: true, phase: 2 },
  { id: "abonelikler", hubId: "finans", name: "Abonelikler", shortName: "Abonelik", description: "Tekrarlayan ödemeler.", accentVar: "--color-finans", icon: Repeat, route: "/hublar/finans/abonelikler", enabledByDefault: true, phase: 2 },
  { id: "birikim", hubId: "finans", name: "Birikim Hedefleri", shortName: "Birikim", description: "Hedef odaklı birikim.", accentVar: "--color-finans", icon: PiggyBank, route: "/hublar/finans/birikim", enabledByDefault: true, phase: 2 },
  { id: "aliskanliklar", hubId: "aliskanlik", name: "Alışkanlıklar", shortName: "Alışkanlık", description: "Günlük alışkanlık takibi.", accentVar: "--color-uyku", icon: Repeat, route: "/hublar/aliskanlik/aliskanliklar", enabledByDefault: true, phase: 2 },
  { id: "hedefler", hubId: "aliskanlik", name: "Uzun Vadeli Hedefler", shortName: "Hedefler", description: "Uzun vadeli hedef takibi.", accentVar: "--color-uyku", icon: Flag, route: "/hublar/aliskanlik/hedefler", enabledByDefault: true, phase: 2 },
  { id: "zaman-cizelgesi", hubId: "takvim", name: "Günlük Zaman Çizelgesi", shortName: "Çizelge", description: "Günün blokları.", accentVar: "--color-su", icon: CalendarDays, route: "/hublar/takvim/cizelge", enabledByDefault: true, phase: 2 },
  { id: "rutinler", hubId: "takvim", name: "Sabah/Akşam Rutinleri", shortName: "Rutinler", description: "Sabit rutin şablonları.", accentVar: "--color-su", icon: SunMoon, route: "/hublar/takvim/rutinler", enabledByDefault: true, phase: 2 },
];

export function isModuleEnabled(m: ModuleDescriptor, settings: Pick<AppSettings, "moduleToggles"> | undefined) {
  if (m.phase > CURRENT_PHASE) return false;
  const override = settings?.moduleToggles?.[m.id];
  return override ?? m.enabledByDefault;
}

export function getEnabledModules(settings: Pick<AppSettings, "moduleToggles"> | undefined) {
  return MODULES.filter((m) => isModuleEnabled(m, settings));
}

export function getModulesForHub(hubId: string, settings: Pick<AppSettings, "moduleToggles"> | undefined) {
  return getEnabledModules(settings).filter((m) => m.hubId === hubId);
}

export function getEnabledHubs(settings: Pick<AppSettings, "moduleToggles"> | undefined) {
  const enabled = getEnabledModules(settings);
  return HUBS.filter((h) => enabled.some((m) => m.hubId === h.id));
}

export function getModuleById(id: string) {
  return MODULES.find((m) => m.id === id);
}

export function getHubById(id: string) {
  return HUBS.find((h) => h.id === id);
}

/** Ayarlar > Modüller listesinde göstermek için: mevcut aşamadaki tüm modüller (aç/kapa dahil). */
export function getConfigurableModules() {
  return MODULES.filter((m) => m.phase <= CURRENT_PHASE);
}
