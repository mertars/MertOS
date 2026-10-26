"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, CalendarDays, FolderGit2, HeartPulse, MessageCircle } from "lucide-react";
import { fetchAssistantSettings } from "@/lib/assistant/client";
import { cn } from "@/lib/utils";
import { EffectLevelProvider } from "./effect-level";
import { ProactiveRunner, StartVoiceBanner } from "./proactive";
import { Wallpaper } from "./wallpaper";

// Faz 3 uygulama kabuğu: efekt seviyesi + hareketli arka plan + gezinme.
// Telefon: alttaki cam çubukta 5 sekme (Asistan, Bugün, Sağlık, Projeler,
// Hafızam). Bilgisayar: üstte Asistan / Hafızam / Ayarlar; ana görünüm
// /asistan ve /bugun'da tek ekranlık 3 sütun (components/fx/desktop-home.tsx).
// Eski modüller (Hub'lar, İstatistik, Ayarlar alt sayfaları) aynı kabukta açılır.

export const PHONE_TABS = [
  { href: "/asistan", label: "Asistan", icon: MessageCircle, color: "--fx-asistan", exact: true },
  { href: "/bugun", label: "Bugün", icon: CalendarDays, color: "--fx-program", exact: false },
  { href: "/saglik", label: "Sağlık", icon: HeartPulse, color: "--fx-saglik", exact: false },
  { href: "/projeler", label: "Projeler", icon: FolderGit2, color: "--fx-proje", exact: false },
  { href: "/asistan/hafizam", label: "Hafızam", icon: Brain, color: "--fx-hafiza", exact: false },
] as const;

export const DESKTOP_TABS = [
  { href: "/asistan", label: "Asistan", color: "--fx-asistan", match: ["/asistan", "/bugun"] },
  { href: "/asistan/hafizam", label: "Hafızam", color: "--fx-hafiza", match: ["/asistan/hafizam"] },
  { href: "/ayarlar", label: "Ayarlar", color: "--fx-text", match: ["/ayarlar"] },
] as const;

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

const syncSettings = () => fetchAssistantSettings().then((s) => ({ efekt: s.efekt, arka: s.arka }));

export function FxAppShell({ children }: { children: React.ReactNode }) {
  return (
    <EffectLevelProvider sync={syncSettings} className="fx relative flex min-h-dvh flex-col">
      <Wallpaper />
      <DesktopTopBar />
      <div className="relative z-10 flex-1 pb-28 lg:pb-0">{children}</div>
      <PhoneTabBar />
      <ProactiveRunner />
      <StartVoiceBanner />
    </EffectLevelProvider>
  );
}

function PhoneTabBar() {
  const pathname = usePathname() ?? "";
  // Hafızam /asistan altında: Asistan sekmesi yalnızca tam /asistan'da yanar
  return (
    <nav aria-label="Ana gezinme" className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),12px)] z-30 lg:hidden">
      <div
        className="fx-glass flex h-[68px] items-stretch justify-around px-1"
        style={{ ["--accent" as string]: "var(--fx-text)", ["--fx-radius" as string]: "24px" }}
      >
        {PHONE_TABS.map((t) => {
          const on = isActive(pathname, t.href, t.exact);
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className="relative flex flex-1 flex-col items-center justify-center gap-1">
              <span
                className={cn("absolute inset-x-1.5 inset-y-2 rounded-[16px] transition-opacity duration-300", on ? "opacity-100" : "opacity-0")}
                style={{
                  background: `color-mix(in srgb, var(${t.color}) 16%, transparent)`,
                  boxShadow: `inset 0 0 0 1px color-mix(in srgb, var(${t.color}) 40%, transparent)`,
                }}
              />
              <Icon className="relative h-[19px] w-[19px] transition-colors" style={{ color: on ? `var(${t.color})` : "var(--fx-text-3)" }} />
              <span className={cn("relative text-[10.5px] font-medium", on ? "text-[var(--fx-text)]" : "text-[var(--fx-text-3)]")}>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function DesktopTopBar() {
  const pathname = usePathname() ?? "";
  const now = new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Istanbul" }).format(new Date());
  return (
    <header className="relative z-20 hidden h-16 shrink-0 items-center justify-between px-7 lg:flex">
      <div className="flex w-[260px] items-center gap-3">
        <Link href="/asistan" className="text-[17px] font-semibold tracking-[0.18em]">
          MERTOS
        </Link>
        <span className="fx-num text-[11px] uppercase text-[var(--fx-text-3)]" suppressHydrationWarning>
          {now}
        </span>
      </div>
      <nav className="fx-glass flex gap-1 p-1" style={{ ["--accent" as string]: "var(--fx-text)", ["--fx-radius" as string]: "999px" }}>
        {DESKTOP_TABS.map((t) => {
          // en uzun eşleşen sekme yanar (/asistan/hafizam → Hafızam)
          const best = DESKTOP_TABS.filter((x) => x.match.some((m) => isActive(pathname, m, m === "/asistan"))).sort((a, b) => b.href.length - a.href.length)[0];
          const on = best?.href === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={cn("rounded-full px-5 py-1.5 text-[13px] font-medium transition-colors", on ? "text-[var(--fx-text)]" : "text-[var(--fx-text-3)] hover:text-[var(--fx-text-2)]")}
              style={
                on
                  ? { background: `color-mix(in srgb, var(${t.color}) 18%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, var(${t.color}) 45%, transparent)` }
                  : undefined
              }
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="w-[260px]" />
    </header>
  );
}
