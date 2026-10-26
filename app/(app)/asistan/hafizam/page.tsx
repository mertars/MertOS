"use client";

import { useEffect, useState } from "react";
import { Minus, Pencil, Plus, RotateCw, Search, Star, Trash2 } from "lucide-react";
import { SectionTitle } from "@/components/fx/bits";
import { CardLabel, GlassCard } from "@/components/fx/glass-card";
import {
  deleteMemoryNote,
  fetchMealLog,
  fetchMemories,
  patchMealLog,
  restoreMemoryNote,
  undoMealLog,
  updateMemoryNote,
  type ClientMemory,
} from "@/lib/assistant/client";
import { MEMORY_CATEGORY_LABELS, type MemoryCategory } from "@/lib/assistant/memory-extract";
import { normalizeTr } from "@/lib/assistant/text";
import type { MealLogRow } from "@/lib/assistant/types";
import { showUndoToast, useToastStore } from "@/lib/store/toast-store";
import { cn } from "@/lib/utils";

// Hafızam (Faz 3, docs/gorev-dosyasi/faz-3-tasarim.md): asistanın Mert hakkında
// kaydettikleri kartlarda — sevdikleri/sevmedikleri, yediği tarifler (tarih,
// puan, "tekrar yap"), alışkanlıklar, notlar. Her kayıtta yalnızca sil ve düzelt
// (§ 8: elle not ekleme yok). Silme "Geri al" ile geri alınabilir.

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });
const NOTE_CATEGORIES: MemoryCategory[] = ["saglik", "kisisel", "tarif", "diger"];
const MEAL_LABEL = { kahvalti: "kahvaltı", ogle: "öğle", aksam: "akşam" } as const;

/** Yemek tercihi notu "sevmiyor/sevmez" diyorsa sevmediği, değilse sevdiği. */
function isDislike(text: string): boolean {
  return /\bsevm|\bhoslanm|\bistem|\byemez|\byemiyor/.test(normalizeTr(text));
}

export default function HafizamPage() {
  const [memories, setMemories] = useState<ClientMemory[] | null>(null);
  const [meals, setMeals] = useState<MealLogRow[] | null>(null);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState("");
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    fetchMemories()
      .then((r) => setMemories(r.memories))
      .catch((e) => setError(e instanceof Error ? e.message : "Notlar okunamadı."));
    fetchMealLog(60)
      .then((r) => setMeals(r.meals))
      .catch(() => setMeals([]));
  }, []);

  const q = normalizeTr(query);
  const match = (text: string) => !q || normalizeTr(text).includes(q);
  const list = (memories ?? []).filter((m) => match(m.text));
  const food = list.filter((m) => m.category === "yemek_tercihi");
  const groups = {
    likes: food.filter((m) => !isDislike(m.text)),
    dislikes: food.filter((m) => isDislike(m.text)),
    habits: list.filter((m) => m.category === "aliskanlik"),
    notes: list.filter((m) => NOTE_CATEGORIES.includes(m.category)),
  };
  const shownMeals = (meals ?? []).filter((m) => match(m.mealName));

  const fail = (title: string, e: unknown) => push({ title, description: e instanceof Error ? e.message : undefined, variant: "danger" });

  async function saveMemory(m: ClientMemory, text: string) {
    try {
      const { memory } = await updateMemoryNote(m.id, text);
      setMemories((list) => (list ?? []).map((x) => (x.id === m.id ? memory : x)));
      return true;
    } catch (e) {
      fail("Kaydedilemedi", e);
      return false;
    }
  }

  async function removeMemory(m: ClientMemory) {
    try {
      await deleteMemoryNote(m.id);
      setMemories((list) => (list ?? []).filter((x) => x.id !== m.id));
      showUndoToast("Not silindi", async () => {
        try {
          const { memory } = await restoreMemoryNote(m.id);
          setMemories((list) => [memory, ...(list ?? [])].sort((a, b) => b.id - a.id));
        } catch (e) {
          fail("Geri alınamadı", e);
        }
      });
    } catch (e) {
      fail("Silinemedi", e);
    }
  }

  async function saveMeal(m: MealLogRow, patch: { rating: number | null; repeat: boolean }) {
    try {
      await patchMealLog(m.id, patch);
      setMeals((list) => (list ?? []).map((x) => (x.id === m.id ? { ...x, ...patch } : x)));
      return true;
    } catch (e) {
      fail("Kaydedilemedi", e);
      return false;
    }
  }

  async function removeMeal(m: MealLogRow) {
    try {
      await undoMealLog(m.id);
      setMeals((list) => (list ?? []).filter((x) => x.id !== m.id));
      showUndoToast("Kayıt silindi", async () => {
        try {
          await patchMealLog(m.id, { restore: true });
          setMeals((list) => [m, ...(list ?? [])].sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1)));
        } catch (e) {
          fail("Geri alınamadı", e);
        }
      });
    } catch (e) {
      fail("Silinemedi", e);
    }
  }

  const loading = memories === null && !error;
  return (
    <main className="mx-auto max-w-5xl px-4 pb-10 lg:px-7">
      <SectionTitle eyebrow={`Asistanın notları · ${memories?.length ?? "–"}`} title="Hafızam" />
      <p className="fx-enter mb-4 max-w-xl text-[13px] leading-relaxed text-[var(--fx-text-2)]">
        Asistanın sizin sözlerinizden kaydettikleri. Yanlış olanı düzeltin ya da silin; silinen not bir daha kullanılmaz.
      </p>
      <label className="fx-glass mb-4 flex h-11 items-center gap-2 px-3.5" style={{ ["--accent" as string]: "var(--fx-hafiza)", ["--fx-radius" as string]: "14px" }}>
        <Search className="h-4 w-4 text-[var(--fx-text-3)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hafızada ara…"
          aria-label="Hafızada ara"
          className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--fx-text-3)]"
        />
      </label>
      {error && <p className="mb-3 text-[13px] text-[var(--fx-text-2)]">{error}</p>}
      {loading && <div className="fx-glass h-32 animate-pulse" />}

      {!loading && (
        <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr] lg:gap-4">
          {/* Sevdikleri / sevmedikleri — geniş */}
          <GlassCard accent="--fx-hafiza" index={1} className="lg:col-span-2">
            <CardLabel>Sevdikleri / sevmedikleri</CardLabel>
            <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
              <MemoryList items={groups.likes} icon="like" empty="Sevdiği bir yemek notu yok." onSave={saveMemory} onDelete={removeMemory} />
              <MemoryList items={groups.dislikes} icon="dislike" empty="Sevmediği bir yemek notu yok." onSave={saveMemory} onDelete={removeMemory} />
            </div>
          </GlassCard>

          {/* Yediği tarifler */}
          <GlassCard accent="--fx-asistan" index={2} className="lg:row-span-2">
            <div className="flex items-baseline justify-between">
              <CardLabel>Yediği tarifler</CardLabel>
              <span className="fx-num text-[10.5px] text-[var(--fx-text-3)]">60 GÜN</span>
            </div>
            {meals === null && <div className="mt-3 h-16 animate-pulse rounded-[12px] bg-white/[0.04]" />}
            {meals?.length === 0 && <p className="mt-2 text-[12.5px] text-[var(--fx-text-3)]">Henüz öğün kaydı yok — Bugün ekranında “Yedim” ile kaydedilir.</p>}
            <ul className="mt-1 divide-y divide-white/[0.06]">
              {shownMeals.map((m) => (
                <MealRow key={m.id} meal={m} onSave={saveMeal} onDelete={removeMeal} />
              ))}
            </ul>
          </GlassCard>

          <GlassCard accent="--fx-program" index={3}>
            <CardLabel>Alışkanlıklar</CardLabel>
            <MemoryList items={groups.habits} empty="Alışkanlık notu yok." onSave={saveMemory} onDelete={removeMemory} />
          </GlassCard>

          <GlassCard accent="--fx-proje" index={4}>
            <CardLabel>Notlar</CardLabel>
            <MemoryList items={groups.notes} showCategory empty="Başka not yok." onSave={saveMemory} onDelete={removeMemory} />
          </GlassCard>
        </div>
      )}
    </main>
  );
}

function MemoryList({
  items,
  icon,
  empty,
  showCategory,
  onSave,
  onDelete,
}: {
  items: ClientMemory[];
  icon?: "like" | "dislike";
  empty: string;
  showCategory?: boolean;
  onSave: (m: ClientMemory, text: string) => Promise<boolean>;
  onDelete: (m: ClientMemory) => void;
}) {
  if (!items.length) return <p className="mt-2 py-1 text-[12.5px] text-[var(--fx-text-3)]">{empty}</p>;
  return (
    <ul className="mt-1 divide-y divide-white/[0.06]">
      {items.map((m) => (
        <MemoryRow key={m.id} memory={m} icon={icon} showCategory={showCategory} onSave={onSave} onDelete={onDelete} />
      ))}
    </ul>
  );
}

function RowActions({ onEdit, onDelete, label }: { onEdit: () => void; onDelete: () => void; label: string }) {
  return (
    <>
      <button type="button" onClick={onEdit} aria-label={`${label}: düzelt`} className="grid h-9 w-9 shrink-0 place-items-center text-[var(--fx-text-3)] hover:text-[var(--fx-text)]">
        <Pencil className="h-[15px] w-[15px]" />
      </button>
      <button type="button" onClick={onDelete} aria-label={`${label}: sil`} className="grid h-9 w-9 shrink-0 place-items-center text-[var(--fx-text-3)] hover:text-[var(--fx-text)]">
        <Trash2 className="h-[15px] w-[15px]" />
      </button>
    </>
  );
}

function EditButtons({ onCancel, saving, disabled }: { onCancel: () => void; saving: boolean; disabled?: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onCancel} className="h-9 rounded-full px-4 text-[12.5px] text-[var(--fx-text-2)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">
        Vazgeç
      </button>
      <button type="submit" disabled={saving || disabled} className="h-9 rounded-full bg-[var(--fx-text)] px-4 text-[12.5px] font-semibold text-black disabled:opacity-40">
        Kaydet
      </button>
    </div>
  );
}

function MemoryRow({
  memory,
  icon,
  showCategory,
  onSave,
  onDelete,
}: {
  memory: ClientMemory;
  icon?: "like" | "dislike";
  showCategory?: boolean;
  onSave: (m: ClientMemory, text: string) => Promise<boolean>;
  onDelete: (m: ClientMemory) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(memory.text);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (value.length < 2 || saving) return;
    if (value === memory.text) return setEditing(false);
    setSaving(true);
    if (await onSave(memory, value)) setEditing(false);
    setSaving(false);
  }

  if (editing)
    return (
      <li className="py-2.5">
        <form onSubmit={submit} className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            rows={2}
            autoFocus
            aria-label="Notu düzelt"
            className="w-full resize-none rounded-[12px] bg-white/[0.05] px-3 py-2 text-[14px] leading-snug outline-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] focus:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]"
          />
          <EditButtons
            saving={saving}
            disabled={text.trim().length < 2}
            onCancel={() => {
              setText(memory.text);
              setEditing(false);
            }}
          />
        </form>
      </li>
    );

  return (
    <li className="flex items-start gap-2 py-2">
      {icon && (
        <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full", icon === "like" ? "bg-[var(--fx-saglik)]/20 text-[var(--fx-saglik)]" : "bg-[var(--fx-asistan)]/20 text-[var(--fx-asistan)]")}>
          {icon === "like" ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[14px] leading-snug">{memory.text}</p>
        <p className="fx-num mt-0.5 text-[9.5px] uppercase text-[var(--fx-text-3)]">
          {showCategory && `${MEMORY_CATEGORY_LABELS[memory.category]} · `}
          {DATE_FMT.format(new Date(memory.createdAt))}
          {memory.updatedAt !== memory.createdAt && " · düzeltildi"}
        </p>
      </div>
      <RowActions label="Not" onEdit={() => setEditing(true)} onDelete={() => onDelete(memory)} />
    </li>
  );
}

function Stars({ value, onChange }: { value: number | null; onChange?: (v: number | null) => void }) {
  return (
    <span className="flex items-center" role={onChange ? "radiogroup" : undefined} aria-label="Puan">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value !== null && n <= value;
        const star = <Star className={cn("h-3.5 w-3.5", on ? "fill-[var(--fx-program)] text-[var(--fx-program)]" : "text-white/20")} />;
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} puan`} onClick={() => onChange(value === n ? null : n)} className="grid h-9 w-8 place-items-center">
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </span>
  );
}

function MealRow({
  meal,
  onSave,
  onDelete,
}: {
  meal: MealLogRow;
  onSave: (m: MealLogRow, patch: { rating: number | null; repeat: boolean }) => Promise<boolean>;
  onDelete: (m: MealLogRow) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(meal.rating);
  const [repeat, setRepeat] = useState(meal.repeat);
  const [saving, setSaving] = useState(false);
  const [, m, d] = meal.date.split("-");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (await onSave(meal, { rating, repeat })) setEditing(false);
    setSaving(false);
  }

  if (editing)
    return (
      <li className="py-2.5">
        <form onSubmit={submit} className="space-y-2">
          <p className="text-[14px] font-medium">{meal.mealName}</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Stars value={rating} onChange={setRating} />
            <button
              type="button"
              onClick={() => setRepeat((r) => !r)}
              aria-pressed={repeat}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium",
                repeat ? "bg-[var(--fx-asistan)]/20 text-[color-mix(in_srgb,var(--fx-asistan)_80%,white)]" : "text-[var(--fx-text-3)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]",
              )}
            >
              <RotateCw className="h-3.5 w-3.5" /> Tekrar yap
            </button>
          </div>
          <EditButtons
            saving={saving}
            onCancel={() => {
              setRating(meal.rating);
              setRepeat(meal.repeat);
              setEditing(false);
            }}
          />
        </form>
      </li>
    );

  return (
    <li className="flex items-center gap-2 py-2">
      <span className="fx-num w-11 shrink-0 text-[10.5px] text-[var(--fx-text-3)]">
        {d}.{m}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] leading-snug">{meal.mealName}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Stars value={meal.rating} />
          <span className="text-[10.5px] text-[var(--fx-text-3)]">
            {MEAL_LABEL[meal.mealType]}
            {meal.isLeftover && " · kalan"}
          </span>
          {meal.repeat && (
            <span className="fx-chip !h-5 shrink-0 whitespace-nowrap !px-2 !text-[9px]" style={{ ["--accent" as string]: "var(--fx-asistan)" }}>
              Tekrar yap
            </span>
          )}
        </div>
      </div>
      <RowActions label={meal.mealName} onEdit={() => setEditing(true)} onDelete={() => onDelete(meal)} />
    </li>
  );
}
