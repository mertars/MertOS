"use client";

import { useCallback, useEffect, useState } from "react";
import { showUndoToast, useToastStore } from "@/lib/store/toast-store";
import {
  addTodoItem,
  ApiError,
  deleteTodoItem,
  fetchBrief,
  logMeal,
  readCachedBrief,
  setRoutine,
  setTodoItemDone,
  undoMealLog,
  type CachedBrief,
} from "./client";
import type { BriefMeal, DailyBrief } from "./daily";
import type { RoutineItem, TodoItem } from "./types";

// Günlük özetin (LLM'siz günlük motor) istemci durumu: önce telefondaki son
// özet, sonra sunucudan tazelenir (§ 16.2); uygulamaya dönünce / internet
// gelince yenilenir. İşaretlemeler iyimser — sunucu reddederse geri yüklenir.

export type BriefState =
  | { status: "yukleniyor" }
  | { status: "hazir"; brief: DailyBrief }
  | { status: "cevrimdisi"; cached: CachedBrief | null }
  | { status: "db-yok" }
  | { status: "hata"; message: string; cached: CachedBrief | null };

/** Sunucudan özeti çeker; hata türüne göre çevrimdışı/önbellek durumuna düşer. 401'de null (giriş sayfasına yönlendirildi). */
async function resolveBriefState(): Promise<BriefState | null> {
  try {
    return { status: "hazir", brief: await fetchBrief() };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    if (e instanceof ApiError && e.code === "db-yok") return { status: "db-yok" };
    const cached = readCachedBrief();
    if (e instanceof ApiError && e.status === 0) return { status: "cevrimdisi", cached };
    return { status: "hata", message: e instanceof Error ? e.message : "Bilinmeyen hata", cached };
  }
}

export function applyRoutineLocally(brief: DailyBrief, item: RoutineItem, done: boolean): DailyBrief {
  const schedule = brief.schedule.map((s) => (s.routineItem === item ? { ...s, done } : s));
  const routineItems = schedule.filter((s) => s.routineItem);
  return {
    ...brief,
    schedule,
    choreDone: item === "temizlik" ? done : brief.choreDone,
    routine: { done: routineItems.filter((s) => s.done).length, total: routineItems.length },
  };
}

/** Gösterilecek özet: hazırsa güncel, değilse telefondaki son özet (salt okunur). */
export function visibleBrief(state: BriefState): { brief: DailyBrief | null; readOnly: boolean } {
  if (state.status === "hazir") return { brief: state.brief, readOnly: false };
  if (state.status === "cevrimdisi" || state.status === "hata") return { brief: state.cached?.brief ?? null, readOnly: true };
  return { brief: null, readOnly: true };
}

export function useBrief() {
  // Önce telefondaki son özet (bileşen yalnızca istemcide render edilir — Providers hazır olunca).
  const [state, setState] = useState<BriefState>(() => {
    const cached = typeof window === "undefined" ? null : readCachedBrief();
    return cached ? { status: "hazir", brief: cached.brief } : { status: "yukleniyor" };
  });
  const push = useToastStore((s) => s.push);

  const reload = useCallback(() => resolveBriefState().then((next) => next && setState(next)), []);

  useEffect(() => {
    reload();
    const onVisible = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", reload);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", reload);
    };
  }, [reload]);

  const fail = useCallback(
    (title: string, e: unknown) => push({ title, description: e instanceof Error ? e.message : undefined, variant: "danger" }),
    [push],
  );

  async function toggleRoutine(item: RoutineItem, done: boolean) {
    if (state.status !== "hazir") return;
    setState({ status: "hazir", brief: applyRoutineLocally(state.brief, item, done) });
    try {
      await setRoutine(item, done);
    } catch (e) {
      fail("Kaydedilemedi", e);
    }
    reload();
  }

  async function markMealEaten(meal: BriefMeal) {
    const s = meal.suggestion;
    if (s.kind === "yok") return;
    try {
      const { id } = await logMeal({ mealType: meal.mealType, mealId: s.meal.id, mealName: s.meal.name, isLeftover: s.kind === "kalan" });
      showUndoToast(`İşaretledim: ${meal.label.toLowerCase()} — ${s.meal.name}`, async () => {
        await undoMealLog(id).catch(() => null);
        reload();
      });
      reload();
    } catch (e) {
      fail("Kaydedilemedi", e);
    }
  }

  async function toggleTodo(todo: TodoItem, done: boolean) {
    if (state.status !== "hazir") return;
    setState({ status: "hazir", brief: { ...state.brief, todos: (state.brief.todos ?? []).map((t) => (t.id === todo.id ? { ...t, done } : t)) } });
    try {
      await setTodoItemDone(todo.id, done);
    } catch (e) {
      fail("Kaydedilemedi", e);
    }
    reload();
  }

  async function removeTodo(todo: TodoItem) {
    try {
      await deleteTodoItem(todo.id);
      reload();
    } catch (e) {
      fail("Silinemedi", e);
    }
  }

  async function addTodo(title: string, time: string | null): Promise<boolean> {
    try {
      await addTodoItem(title, time);
      reload();
      return true;
    } catch (e) {
      fail("Eklenemedi", e);
      return false;
    }
  }

  return { state, reload, toggleRoutine, markMealEaten, toggleTodo, removeTodo, addTodo };
}

export type BriefActions = Omit<ReturnType<typeof useBrief>, "state" | "reload">;
