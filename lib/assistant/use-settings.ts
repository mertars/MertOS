"use client";

import { useEffect, useSyncExternalStore } from "react";
import { fetchAssistantSettings, patchAssistantSettings } from "./client";
import { DEFAULT_SETTINGS, type AssistantSettings } from "./config";

// Asistan ayarları (sunucuda `settings`) için istemci deposu: ses seçimi, sesli
// okuma, planlı konuşma, hitap… Bir kez çekilir, telefonda önbelleklenir;
// birden çok bileşen aynı değeri görür.

const CACHE_KEY = "mertos-asistan-ayar";
let value: AssistantSettings | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function readCache(): AssistantSettings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AssistantSettings>) } : null;
  } catch {
    return null;
  }
}

function store(next: AssistantSettings) {
  value = next;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // önemli değil
  }
  emit();
}

function load() {
  loading ??= fetchAssistantSettings()
    .then(store)
    .catch(() => undefined)
    .finally(() => {
      loading = null;
    });
  return loading;
}

function snapshot(): AssistantSettings {
  if (!value) value = readCache() ?? DEFAULT_SETTINGS;
  return value;
}

/** Ayarları yazar (önce yerelde, sonra sunucuda). Sunucu reddederse hata fırlatır. */
export async function saveAssistantSettings(patch: Parameters<typeof patchAssistantSettings>[0]) {
  store({ ...snapshot(), ...patch });
  store(await patchAssistantSettings(patch));
}

export function useAssistantSettings(): AssistantSettings {
  useEffect(() => {
    void load();
  }, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    snapshot,
    () => DEFAULT_SETTINGS,
  );
}
