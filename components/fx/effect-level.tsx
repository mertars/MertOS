"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import type { EffectLevel } from "@/lib/assistant/config";

// Efekt seviyesi (Faz 3): Tam / Orta / Düşük / Kapalı — ayar sunucuda
// (`settings.efekt`), telefonda da hemen uygulansın diye localStorage'da
// önbelleklenir. Sistemin "hareketi azalt" ayarı açıksa seviye en fazla
// "Düşük" olur (Kapalı seçildiyse Kapalı kalır).

const CACHE_KEY = "mertos-efekt";
const ORDER: EffectLevel[] = ["kapali", "dusuk", "orta", "tam"];

export function readCachedEffect(): EffectLevel | null {
  try {
    const v = localStorage.getItem(CACHE_KEY);
    return v && (ORDER as string[]).includes(v) ? (v as EffectLevel) : null;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();

export function cacheEffect(level: EffectLevel) {
  try {
    localStorage.setItem(CACHE_KEY, level);
  } catch {
    // önemli değil
  }
  listeners.forEach((l) => l());
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

export function useEffectLevel(): EffectLevel {
  return useContext(EffectContext);
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

/** `level` verilirse o kullanılır (önizleme / ayar ekranı), yoksa önbellekteki seçim. */
export function EffectLevelProvider({ level, children, className }: { level?: EffectLevel; children: React.ReactNode; className?: string }) {
  const reduced = usePrefersReducedMotion();
  // sunucuda "tam"; istemcide telefondaki son seçim
  const cached = useSyncExternalStore(subscribeCache, () => readCachedEffect() ?? "tam", () => "tam" as EffectLevel);
  const applied = effectiveLevel(level ?? cached, reduced);
  return (
    <EffectContext.Provider value={applied}>
      <div data-fx={applied} className={className}>
        {children}
      </div>
    </EffectContext.Provider>
  );
}
