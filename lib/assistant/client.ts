"use client";

import type { AssistantSettings } from "./config";
import type { DailyBrief, DayHistory } from "./daily";
import type { MemoryCategory } from "./memory-extract";
import type { MealLogRow, MealType, RoutineItem, TodoItem } from "./types";

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

export function fetchHealthHistory(days = 14) {
  return request<{ days: DayHistory[] }>(`/api/assistant/health?days=${days}`);
}

export function setRoutine(item: RoutineItem, done: boolean) {
  return request<{ ok: true }>("/api/assistant/routine", { method: "POST", body: JSON.stringify({ item, done }) });
}

// --- Yapılacaklar --------------------------------------------------------------

export function fetchTodos(from: string, to: string) {
  return request<{ todos: TodoItem[] }>(`/api/assistant/todos?from=${from}&to=${to}`);
}

export function addTodoItem(title: string, time: string | null) {
  return request<{ todo: TodoItem }>("/api/assistant/todos", { method: "POST", body: JSON.stringify({ title, time }) });
}

export function setTodoItemDone(id: number, done: boolean) {
  return request<{ todo: TodoItem }>(`/api/assistant/todos/${id}`, { method: "PATCH", body: JSON.stringify({ done }) });
}

export function deleteTodoItem(id: number) {
  return request<{ ok: true }>(`/api/assistant/todos/${id}`, { method: "DELETE" });
}

export function logMeal(entry: { mealType: MealType; mealId: string | null; mealName: string; isLeftover: boolean }) {
  return request<{ ok: true; id: number }>("/api/assistant/meal-log", { method: "POST", body: JSON.stringify(entry) });
}

export function fetchMealLog(days = 60) {
  return request<{ meals: MealLogRow[] }>(`/api/assistant/meal-log?days=${days}`);
}

export function patchMealLog(id: number, patch: { rating?: number | null; repeat?: boolean; restore?: true }) {
  return request<{ ok: true }>(`/api/assistant/meal-log?id=${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function undoMealLog(id: number) {
  return request<{ ok: true }>(`/api/assistant/meal-log?id=${id}`, { method: "DELETE" });
}

export function fetchAssistantSettings() {
  return request<AssistantSettings>("/api/assistant/settings");
}

export function patchAssistantSettings(patch: Partial<Pick<AssistantSettings, "hitap" | "efekt" | "arka" | "ses" | "sesliOkuma" | "proaktif" | "blokDk" | "gunlukBlok" | "sinavHaftasiDers">>) {
  return request<AssistantSettings>("/api/assistant/settings", { method: "PATCH", body: JSON.stringify(patch) });
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
  window.location.href = new URL("/giris", window.location.origin).href;
}

// --- Sohbet (Faz 2) ------------------------------------------------------------

export interface ClientChatMessage {
  id: number;
  conversationId: string;
  role: "user" | "assistant" | "not";
  content: string;
  createdAt: string;
  meta: { memoryId?: number; routine?: { date: string; items: RoutineItem[] }; todosDone?: number[]; todoId?: number; mealLogId?: number; studyBlockId?: number; routineUndone?: boolean; system?: boolean; proactive?: string } | null;
}

const CONVERSATION_KEY = "mertos-sohbet-id";

export function storedConversationId(): string | null {
  try {
    return localStorage.getItem(CONVERSATION_KEY);
  } catch {
    return null;
  }
}

export function storeConversationId(id: string | null) {
  try {
    if (id) localStorage.setItem(CONVERSATION_KEY, id);
    else localStorage.removeItem(CONVERSATION_KEY);
  } catch {
    // önemli değil
  }
}

export function fetchChat(conversationId: string | null) {
  const q = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : "";
  return request<{ conversationId: string | null; messages: ClientChatMessage[] }>(`/api/assistant/chat${q}`);
}

/** `mode`: "ses" → kısa, sesli okunacak cevap (mikrofonla söylenen mesajlar). */
export function sendChat(conversationId: string | null, message: string, mode: "yazi" | "ses" = "yazi") {
  return request<{ conversationId: string; userMessage: ClientChatMessage; marks: ClientChatMessage | null; reply: ClientChatMessage; todo: ClientChatMessage | null; undone: ClientChatMessage | null; failure: string | null }>("/api/assistant/chat", {
    method: "POST",
    body: JSON.stringify({ conversationId, message, mode }),
  });
}

/** Sohbet bitti → hafıza çıkarma. "Yeni sohbet"te sonucu bekleriz. */
export function endChat(conversationId: string) {
  return request<{ notes: { memoryId: number; text: string }[] }>("/api/assistant/chat/end", {
    method: "POST",
    body: JSON.stringify({ conversationId }),
  });
}

/** Sayfa kapanırken: cevap beklenmez (sendBeacon). */
export function endChatBeacon(conversationId: string) {
  try {
    navigator.sendBeacon("/api/assistant/chat/end", new Blob([JSON.stringify({ conversationId })], { type: "application/json" }));
  } catch {
    // sendBeacon yoksa bir sonraki mesajda 20 dk kuralıyla çıkarılır
  }
}

// --- Hafızam (Faz 3) ------------------------------------------------------------

export interface ClientMemory {
  id: number;
  category: MemoryCategory;
  text: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

export function fetchMemories() {
  return request<{ memories: ClientMemory[] }>("/api/assistant/memories");
}

export function updateMemoryNote(id: number, text: string) {
  return request<{ memory: ClientMemory }>(`/api/assistant/memories/${id}`, { method: "PATCH", body: JSON.stringify({ text }) });
}

export function restoreMemoryNote(id: number) {
  return request<{ memory: ClientMemory }>(`/api/assistant/memories/${id}`, { method: "POST" });
}

export function deleteMemoryNote(id: number) {
  return request<{ ok: true }>(`/api/assistant/memories/${id}`, { method: "DELETE" });
}

/** Sohbetteki "İşaretledim" / "Listeye ekledim" satırını geri al. */
export function undoChatMark(messageId: number) {
  return request<{ message: ClientChatMessage }>(`/api/assistant/chat/marks/${messageId}`, { method: "DELETE" });
}

// --- Planlı konuşma (Faz 4) ----------------------------------------------------

/** Program saati geldi: sunucu doğrular, söylenecekse sohbete yazıp döner (yoksa message: null). */
export function requestProactive(slot: string, conversationId: string | null) {
  return request<{ message: ClientChatMessage | null; reason?: string; spoken: string[] }>("/api/assistant/proactive", {
    method: "POST",
    body: JSON.stringify({ slot, conversationId }),
  });
}

// --- Ders ve sınav (Bölüm 18) -------------------------------------------------

export type StudyOverviewClient = import("@/lib/server/study-repo").StudyOverview;

export function fetchStudy() {
  return request<StudyOverviewClient>("/api/assistant/study");
}

export function addStudyBlocks(entry: { date: string; courseId: string; blocks: number; note?: string | null }) {
  return request<{ blocks: import("./study").StudyBlock[] }>("/api/assistant/study/blocks", { method: "POST", body: JSON.stringify(entry) });
}

export function addStudyBlocksBulk(entries: { date: string; courseId: string; blocks: number }[]) {
  return request<{ blocks: import("./study").StudyBlock[] }>("/api/assistant/study/blocks", { method: "POST", body: JSON.stringify({ entries }) });
}

export function deleteStudyBlock(id: number) {
  return request<{ ok: true }>(`/api/assistant/study/blocks/${id}`, { method: "DELETE" });
}

export function restoreStudyBlock(id: number) {
  return request<{ ok: true }>(`/api/assistant/study/blocks/${id}`, { method: "PATCH", body: JSON.stringify({ restore: true }) });
}

export function setStudyReadiness(courseId: string, score: number) {
  return request<{ ok: true }>("/api/assistant/study/readiness", { method: "POST", body: JSON.stringify({ courseId, score }) });
}

export function setClassAttendance(sessionId: string, attended: boolean) {
  return request<{ ok: true }>("/api/assistant/study/attendance", { method: "POST", body: JSON.stringify({ sessionId, attended }) });
}

export function saveSyllabus(courseId: string, text: string) {
  return request<{ count: number }>("/api/assistant/study/topics", { method: "PUT", body: JSON.stringify({ courseId, text }) });
}

export function setTopicDone(id: number, done: boolean) {
  return request<{ ok: true }>(`/api/assistant/study/topics/${id}`, { method: "PATCH", body: JSON.stringify({ done }) });
}

export function previewStudyImport(text: string) {
  return request<{ lines: import("./study").ImportLine[] }>("/api/assistant/study/import", { method: "POST", body: JSON.stringify({ text }) });
}
