"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CloudOff, Database, Plus, RefreshCw, Utensils, Sparkles, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "@/lib/assistant/client";
import type { BriefMeal, DailyBrief } from "@/lib/assistant/daily";
import type { RoutineItem, TodoItem } from "@/lib/assistant/types";
import { showUndoToast, useToastStore } from "@/lib/store/toast-store";
import { cn } from "@/lib/utils";

// "Bugün" ekranının üstündeki asistan bölümü: günün kararı (§ 16.1), günlük
// program + rutin işaretleme, öğün önerileri, temizlik, yapılacaklar listesi
// (elle ya da sohbetten eklenir) ve haftalık tutarlılık (§ 16.3). Hepsi
// sunucudaki LLM'siz günlük motordan gelir.

type LoadState =
  | { status: "yukleniyor" }
  | { status: "hazir"; brief: DailyBrief }
  | { status: "cevrimdisi"; cached: CachedBrief | null }
  | { status: "db-yok" }
  | { status: "hata"; message: string; cached: CachedBrief | null };

export function DailyBriefSection() {
  // Önce telefondaki son özet gösterilir, sonra sunucudan tazelenir. (Bu bileşen
  // Providers hazır olunca, yalnızca istemcide render edilir — localStorage güvenli.)
  const [state, setState] = useState<LoadState>(() => {
    const cached = readCachedBrief();
    return cached ? { status: "hazir", brief: cached.brief } : { status: "yukleniyor" };
  });
  const push = useToastStore((s) => s.push);

  const load = useCallback(() => resolveBriefState().then((next) => next && setState(next)), []);

  useEffect(() => {
    load();
    // Mac'te işaretlenen bir madde telefona dönünce görünsün.
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", load);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", load);
    };
  }, [load]);

  async function toggleRoutine(item: RoutineItem, done: boolean) {
    if (state.status !== "hazir") return;
    // İyimser güncelleme — sunucu reddederse geri yüklenir.
    setState({ status: "hazir", brief: applyRoutineLocally(state.brief, item, done) });
    try {
      await setRoutine(item, done);
      load();
    } catch (e) {
      push({ title: "Kaydedilemedi", description: e instanceof Error ? e.message : undefined, variant: "danger" });
      load();
    }
  }

  async function toggleTodo(todo: TodoItem, done: boolean) {
    if (state.status !== "hazir") return;
    setState({ status: "hazir", brief: { ...state.brief, todos: (state.brief.todos ?? []).map((t) => (t.id === todo.id ? { ...t, done } : t)) } });
    try {
      await setTodoItemDone(todo.id, done);
    } catch (e) {
      push({ title: "Kaydedilemedi", description: e instanceof Error ? e.message : undefined, variant: "danger" });
    }
    load();
  }

  async function removeTodo(todo: TodoItem) {
    try {
      await deleteTodoItem(todo.id);
      load();
    } catch (e) {
      push({ title: "Silinemedi", description: e instanceof Error ? e.message : undefined, variant: "danger" });
    }
  }

  async function createTodo(title: string, time: string | null) {
    try {
      await addTodoItem(title, time);
      load();
      return true;
    } catch (e) {
      push({ title: "Eklenemedi", description: e instanceof Error ? e.message : undefined, variant: "danger" });
      return false;
    }
  }

  async function markMealEaten(meal: BriefMeal) {
    const s = meal.suggestion;
    if (s.kind === "yok") return;
    try {
      const { id } = await logMeal({ mealType: meal.mealType, mealId: s.meal.id, mealName: s.meal.name, isLeftover: s.kind === "kalan" });
      showUndoToast(`İşaretledim: ${meal.label.toLowerCase()} — ${s.meal.name}`, async () => {
        await undoMealLog(id).catch(() => null);
        load();
      });
      load();
    } catch (e) {
      push({ title: "Kaydedilemedi", description: e instanceof Error ? e.message : undefined, variant: "danger" });
    }
  }

  if (state.status === "yukleniyor") {
    return (
      <div className="px-5">
        <Card className="h-28 animate-pulse" />
      </div>
    );
  }

  if (state.status === "db-yok") {
    return (
      <div className="px-5">
        <Card>
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 shrink-0 text-[var(--color-warning)]" />
            <div>
              <p className="text-[14px] font-semibold">Asistan veritabanı henüz bağlı değil</p>
              <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-1">
                Turso adresi ve anahtarı Vercel&apos;e eklenince günlük plan burada görünecek. Diğer ekranlar normal çalışıyor.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (state.status === "cevrimdisi" || state.status === "hata") {
    const cached = state.cached;
    return (
      <div className="space-y-3">
        <div className="px-5">
          <div className="flex items-center justify-between gap-2 rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-card-raised)] px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-[12.5px] text-[var(--color-text-secondary)]">
              <CloudOff className="h-4 w-4" />
              {state.status === "cevrimdisi" ? "Çevrimdışı" : state.message}
              {cached && ` — son güncelleme ${formatClock(cached.savedAt)}`}
            </div>
            <button onClick={load} aria-label="Yenile" className="flex h-9 w-9 items-center justify-center text-[var(--color-text-secondary)]">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
        {cached && <BriefView brief={cached.brief} readOnly />}
      </div>
    );
  }

  return (
    <BriefView
      brief={state.brief}
      onToggle={toggleRoutine}
      onMealEaten={markMealEaten}
      todoActions={{ onToggle: toggleTodo, onDelete: removeTodo, onAdd: createTodo }}
    />
  );
}

/** Sunucudan özeti çeker; hata türüne göre çevrimdışı/önbellek durumuna düşer. 401'de null (giriş sayfasına yönlendirildi). */
async function resolveBriefState(): Promise<LoadState | null> {
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

function applyRoutineLocally(brief: DailyBrief, item: RoutineItem, done: boolean): DailyBrief {
  const schedule = brief.schedule.map((s) => (s.routineItem === item ? { ...s, done } : s));
  const routineItems = schedule.filter((s) => s.routineItem);
  return {
    ...brief,
    schedule,
    choreDone: item === "temizlik" ? done : brief.choreDone,
    routine: { done: routineItems.filter((s) => s.done).length, total: routineItems.length },
  };
}

function formatClock(iso: string) {
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }).format(
    new Date(iso),
  );
}

const KIND_ACCENT: Record<string, string> = {
  rutin: "--color-su",
  spor: "--color-hareket",
  ogun: "--color-beslenme",
  temizlik: "--color-finans",
  proje: "--color-uretkenlik",
};

function BriefView({
  brief,
  readOnly,
  onToggle,
  onMealEaten,
  todoActions,
}: {
  brief: DailyBrief;
  readOnly?: boolean;
  onToggle?: (item: RoutineItem, done: boolean) => void;
  onMealEaten?: (meal: BriefMeal) => void;
  todoActions?: TodoActions;
}) {
  const mealsByType = new Map(brief.meals.map((m) => [m.mealType, m]));
  const w = brief.week;

  return (
    <div className="space-y-3 px-5">
      {/* Günün kararı */}
      <Card raised className="border-[var(--color-hareket)]/30">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-[var(--color-hareket)] mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Günün kararı</p>
            <p className="text-[15px] font-medium leading-snug mt-1">{brief.decision}</p>
          </div>
        </div>
      </Card>

      {/* Günün programı */}
      <Card>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <p className="text-[15px] font-semibold">
              {brief.weekdayName} · {brief.dayTypeLabel}
            </p>
            <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5">{brief.plan}</p>
          </div>
          <p className="text-[13px] font-semibold tabular-nums text-[var(--color-text-secondary)]">
            {brief.routine.done}/{brief.routine.total}
          </p>
        </div>
        <ul className="space-y-1">
          {brief.schedule.map((s) => {
            const meal = s.mealType ? mealsByType.get(s.mealType) : undefined;
            const accent = KIND_ACCENT[s.kind] ?? "--color-text-secondary";
            return (
              <li key={s.id} className="flex items-start gap-3 py-1.5">
                <span className="w-11 shrink-0 pt-0.5 text-[12.5px] font-medium tabular-nums text-[var(--color-text-tertiary)]">{s.time}</span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[14px] leading-snug", s.done && "text-[var(--color-text-tertiary)] line-through")}>{s.title}</p>
                  {s.detail && <p className="text-[12px] text-[var(--color-text-secondary)]">{s.detail}</p>}
                  {s.kind === "temizlik" && (
                    <p className="text-[12px] text-[var(--color-text-secondary)]">{brief.chores.map((c) => c.title).join(" · ")}</p>
                  )}
                  {s.kind === "proje" && <p className="text-[12px] text-[var(--color-text-tertiary)]">GitHub bağlantısı Faz 5&apos;te gelecek.</p>}
                  {meal && <MealLine meal={meal} readOnly={readOnly} onEaten={onMealEaten} />}
                </div>
                {s.routineItem && (
                  <button
                    disabled={readOnly}
                    onClick={() => onToggle?.(s.routineItem!, !s.done)}
                    aria-label={s.done ? `${s.title}: yapılmadı olarak işaretle` : `${s.title}: yapıldı olarak işaretle`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center -my-2 -mr-2"
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                        s.done ? "border-transparent text-black" : "border-[var(--color-border-strong)]",
                      )}
                      style={s.done ? { backgroundColor: `var(${accent})` } : undefined}
                    >
                      {s.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Yapılacaklar — eski önbellekte `todos` olmayabilir */}
      <TodoCard todos={brief.todos ?? []} actions={readOnly ? undefined : todoActions} />

      {/* Haftalık tutarlılık */}
      <Card>
        <p className="text-[13px] font-semibold mb-2.5">Bu hafta</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          <WeekStat label="Koşu" value={`${w.runs.done}/${w.runs.planned}`} />
          <WeekStat label="Yürüyüş" value={`${w.walks.done}/${w.walks.planned}`} />
          <WeekStat label="Rutin" value={`%${w.routinePct}`} />
          <WeekStat label="Öğün kaydı" value={`${w.mealLogs.count}/${w.mealLogs.expected}`} />
        </div>
      </Card>
    </div>
  );
}

interface TodoActions {
  onToggle: (todo: TodoItem, done: boolean) => void;
  onDelete: (todo: TodoItem) => void;
  onAdd: (title: string, time: string | null) => Promise<boolean>;
}

function TodoCard({ todos, actions }: { todos: TodoItem[]; actions?: TodoActions }) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!actions || !title.trim() || saving) return;
    setSaving(true);
    if (await actions.onAdd(title.trim(), time || null)) {
      setTitle("");
      setTime("");
    }
    setSaving(false);
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[15px] font-semibold">Yapılacaklar</p>
        {todos.length > 0 && (
          <p className="text-[13px] font-semibold tabular-nums text-[var(--color-text-secondary)]">
            {todos.filter((t) => t.done).length}/{todos.length}
          </p>
        )}
      </div>
      {todos.length === 0 && <p className="text-[12.5px] text-[var(--color-text-tertiary)] mb-2">Boş. Buradan ya da asistanla sohbetten eklenir.</p>}
      <ul className="space-y-1">
        {todos.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-1">
            <span className="w-11 shrink-0 text-[12.5px] font-medium tabular-nums text-[var(--color-text-tertiary)]">{t.time ?? "—"}</span>
            <p className={cn("min-w-0 flex-1 text-[14px] leading-snug", t.done && "text-[var(--color-text-tertiary)] line-through")}>{t.title}</p>
            {actions && (
              <>
                <button onClick={() => actions.onDelete(t)} aria-label={`${t.title}: sil`} className="flex h-9 w-7 items-center justify-center text-[var(--color-text-tertiary)]">
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => actions.onToggle(t, !t.done)}
                  aria-label={t.done ? `${t.title}: yapılmadı olarak işaretle` : `${t.title}: yapıldı olarak işaretle`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center -my-2 -mr-2"
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                      t.done ? "border-transparent bg-[var(--color-uretkenlik)] text-black" : "border-[var(--color-border-strong)]",
                    )}
                  >
                    {t.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {actions && (
        <form onSubmit={submit} className="mt-2 flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ekle…"
            maxLength={80}
            aria-label="Yapılacak"
            className="min-w-0 flex-1 h-10 rounded-[12px] border border-[var(--color-border-strong)] bg-[var(--color-card-raised)] px-3 text-[14px] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-white/30"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Saat (isteğe bağlı)"
            className="h-10 w-[92px] rounded-[12px] border border-[var(--color-border-strong)] bg-[var(--color-card-raised)] px-2 text-[14px] tabular-nums outline-none focus:border-white/30"
          />
          <Button type="submit" size="icon" disabled={saving || !title.trim()} aria-label="Ekle">
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      )}
    </Card>
  );
}

function WeekStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[16px] font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">{label}</p>
    </div>
  );
}

function MealLine({ meal, readOnly, onEaten }: { meal: BriefMeal; readOnly?: boolean; onEaten?: (m: BriefMeal) => void }) {
  if (meal.logged) {
    return (
      <p className="mt-0.5 flex items-center gap-1 text-[12px] text-[var(--color-success)]">
        <Check className="h-3 w-3" /> {meal.logged.isLeftover ? "Kalan: " : ""}
        {meal.logged.name}
      </p>
    );
  }
  const s = meal.suggestion;
  if (s.kind === "yok") {
    return <p className="mt-0.5 text-[12px] text-[var(--color-text-tertiary)]">{s.reason}</p>;
  }
  return (
    <div className="mt-1 flex items-center justify-between gap-2 rounded-[12px] bg-white/[0.03] px-3 py-2">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[13px] font-medium">
          <Utensils className="h-3.5 w-3.5 text-[var(--color-beslenme)]" />
          {s.kind === "kalan" ? `Kalan: ${s.meal.name}` : s.meal.name}
        </p>
        <p className="text-[11.5px] text-[var(--color-text-secondary)]">
          {s.kind === "kalan" ? `${s.remaining} porsiyon · ${s.reason}` : `${s.meal.durationMin} dk · ${s.reason}`}
        </p>
      </div>
      {!readOnly && (
        <Button size="sm" variant="secondary" onClick={() => onEaten?.(meal)}>
          Yedim
        </Button>
      )}
    </div>
  );
}
