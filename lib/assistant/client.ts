"use client";

import type { AssistantSettings } from "./config";
import type { DailyBrief } from "./daily";
import type { MealType, RoutineItem } from "./types";

// İstemci tarafı: asistan API'lerine istekler + son günlük özetin telefonda
// saklanması (§ 16.2 — koşuda bağlantı zayıfsa son özet gösterilir).

const BRIEF_CACHE_KEY = "mertos-asistan-ozet";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, cache: "no-store" });
  } catch {
    throw new ApiError("İnternet bağlantısı yok.", 0);
  }
  if (res.status === 401) {
    window.location.href = new URL(`/giris?sonra=${encodeURIComponent(window.location.pathname)}`, window.location.origin).href;
    throw new ApiError("Giriş gerekli.", 401);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? "Sunucu hatası.", res.status, body.code);
  return body as T;
}

export interface CachedBrief {
  brief: DailyBrief;
  savedAt: string;
}

export function readCachedBrief(): CachedBrief | null {
  try {
    const raw = localStorage.getItem(BRIEF_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedBrief) : null;
  } catch {
    return null;
  }
}

export async function fetchBrief(): Promise<DailyBrief> {
  const brief = await request<DailyBrief>("/api/assistant/brief");
  try {
    localStorage.setItem(BRIEF_CACHE_KEY, JSON.stringify({ brief, savedAt: new Date().toISOString() } satisfies CachedBrief));
  } catch {
    // depolama doluysa önbelleksiz devam
  }
  return brief;
}

export function setRoutine(item: RoutineItem, done: boolean) {
  return request<{ ok: true }>("/api/assistant/routine", { method: "POST", body: JSON.stringify({ item, done }) });
}

export function logMeal(entry: { mealType: MealType; mealId: string | null; mealName: string; isLeftover: boolean }) {
  return request<{ ok: true; id: number }>("/api/assistant/meal-log", { method: "POST", body: JSON.stringify(entry) });
}

export function undoMealLog(id: number) {
  return request<{ ok: true }>(`/api/assistant/meal-log?id=${id}`, { method: "DELETE" });
}

export function fetchAssistantSettings() {
  return request<AssistantSettings>("/api/assistant/settings");
}

export function patchAssistantSettings(patch: Partial<Pick<AssistantSettings, "hitap" | "efekt" | "ses">>) {
  return request<AssistantSettings>("/api/assistant/settings", { method: "PATCH", body: JSON.stringify(patch) });
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
  window.location.href = new URL("/giris", window.location.origin).href;
}
