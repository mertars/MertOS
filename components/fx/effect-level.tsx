"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import type { BackgroundChoice, EffectLevel } from "@/lib/assistant/config";

// Efekt seviyesi (Faz 3): Tam / Orta / Düşük / Kapalı + arka plan (Dalga / Toz).
// Ayarlar sunucuda (`settings.efekt`, `settings.arka`); telefonda da anında
// uygulansın diye localStorage'da önbelleklenir. Sistemin "hareketi azalt"
// ayarı açıksa seviye en fazla "Düşük" olur (Kapalı seçildiyse Kapalı kalır).

const EFFECT_KEY = "mertos-efekt";
const BG_KEY = "mertos-arka";
const ORDER: EffectLevel[] = ["kapali", "dusuk", "orta", "tam"];
const BACKGROUNDS: BackgroundChoice[] = ["dalga", "toz"];

function readKey<T extends string>(key: string, allowed: readonly T[]): T | null {
  try {
    const v = localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : null;
  } catch {
    return null;
  }
}

export function readCachedEffect(): EffectLevel | null {
  return readKey(EFFECT_KEY, ORDER);
}

export function readCachedBackground(): BackgroundChoice | null {
  return readKey(BG_KEY, BACKGROUNDS);
}

const listeners = new Set<() => void>();

function writeKey(key: string, value: string) {
  try {
    if (localStorage.getItem(key) === value) return;
    localStorage.setItem(key, value);
  } catch {
    // önemli değil
  }
  listeners.forEach((l) => l());
}

export function cacheEffect(level: EffectLevel) {
  writeKey(EFFECT_KEY, level);
}

export function cacheBackground(bg: BackgroundChoice) {
  writeKey(BG_KEY, bg);
}

function subscribeCache(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Seçilen seviye + sistemin hareket tercihi → uygulanan seviye */
export function effectiveLevel(chosen: EffectLevel, reducedMotion: boolean): EffectLevel {
  if (!reducedMotion) return chosen;
  return ORDER.indexOf(chosen) > ORDER.indexOf("dusuk") ? "dusuk" : chosen;
}

const EffectContext = createContext<EffectLevel>("tam");
const BackgroundContext = createContext<BackgroundChoice>("dalga");

export function useEffectLevel(): EffectLevel {
  return useContext(EffectContext);
}

export function useBackgroundChoice(): BackgroundChoice {
  return useContext(BackgroundContext);
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(l: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", l);
  return () => mq.removeEventListener("change", l);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED_QUERY).matches, () => false);
}

/**
 * `level`/`background` verilirse onlar kullanılır (önizleme), yoksa telefondaki son seçim.
 * `sync` verilirse açılışta sunucudaki ayar okunup önbelleğe yazılır.
 */
export function EffectLevelProvider({
  level,
  background,
  sync,
  children,
  className,
}: {
  level?: EffectLevel;
  background?: BackgroundChoice;
  sync?: () => Promise<{ efekt: EffectLevel; arka: BackgroundChoice }>;
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  // sunucuda varsayılan; istemcide telefondaki son seçim
  const cachedLevel = useSyncExternalStore(subscribeCache, () => readCachedEffect() ?? "tam", () => "tam" as EffectLevel);
  const cachedBg = useSyncExternalStore(subscribeCache, () => readCachedBackground() ?? "dalga", () => "dalga" as BackgroundChoice);

  useEffect(() => {
    if (!sync) return;
    sync()
      .then((s) => {
        cacheEffect(s.efekt);
        cacheBackground(s.arka);
      })
      .catch(() => {
        // çevrimdışı ya da giriş yok: önbellekteki seçimle devam
      });
  }, [sync]);

  const applied = effectiveLevel(level ?? cachedLevel, reduced);
  return (
    <EffectContext.Provider value={applied}>
      <BackgroundContext.Provider value={background ?? cachedBg}>
        <div data-fx={applied} className={className}>
          {children}
        </div>
      </BackgroundContext.Provider>
    </EffectContext.Provider>
  );
}
