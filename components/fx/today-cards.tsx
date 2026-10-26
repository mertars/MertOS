"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Sparkles, X } from "lucide-react";
import { fetchMemories, type ClientMemory } from "@/lib/assistant/client";
import type { BriefMeal, DailyBrief } from "@/lib/assistant/daily";
import type { RoutineItem, TodoItem } from "@/lib/assistant/types";
import type { BriefActions } from "@/lib/assistant/use-brief";
import { cn } from "@/lib/utils";
import { Check, Pill, Ring } from "./bits";
import { CardLabel, GlassCard } from "./glass-card";

// Bugün ekranının kartları (Faz 3). Telefonda Bugün sekmesi, bilgisayarda 3
// sütunlu ana görünümün sağ sütunu bunlardan kurulur. Veri: günlük motor
// (lib/assistant/daily.ts) — LLM yok.

/** "Günün kararı" altındaki küçük etiketler: gün tipi + toplu pişirme durumu (koddan). */
function decisionPills(brief: DailyBrief): { color: string; text: string }[] {
  const pills = [{ color: brief.dayType === "kosu" ? "--fx-saglik" : "--fx-hafiza", text: brief.dayTypeLabel }];
  const leftover = brief.meals.find((m) => !m.logged && m.suggestion.kind === "kalan");
  if (leftover && leftover.suggestion.kind === "kalan") pills.push({ color: "--fx-program", text: `Toplu pişirme · ${leftover.suggestion.remaining} porsiyon kaldı` });
  else {
    const batch = brief.meals.find((m) => !m.logged && m.suggestion.kind === "yeni" && m.suggestion.meal.servings > 1);
    if (batch && batch.suggestion.kind === "yeni") pills.push({ color: "--fx-program", text: `Toplu pişir · ${batch.suggestion.meal.servings} öğüne yeter` });
  }
  return pills;
}

export function DecisionCard({ brief, index = 1, large = true }: { brief: DailyBrief; index?: number; large?: boolean }) {
  return (
    <GlassCard accent="--fx-program" index={index} className="p-5">
      <div className="flex items-center justify-between">
        <span className="fx-chip">
          <Sparkles className="h-3 w-3" /> Günün kararı
        </span>
        <span className="fx-num text-[10px] text-[var(--fx-text-3)]">KOD · LLM YOK</span>
      </div>
      <p className={cn("mt-3 font-medium leading-snug", large ? "text-[19px]" : "text-[16.5px]")}>{brief.decision}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {decisionPills(brief).map((p) => (
          <Pill key={p.text} color={p.color}>
            {p.text}
          </Pill>
        ))}
      </div>
    </GlassCard>
  );
}

export function ProgramCard({
  brief,
  onToggle,
  readOnly,
  index = 2,
  compact,
  className,
}: {
  brief: DailyBrief;
  onToggle?: BriefActions["toggleRoutine"];
  readOnly?: boolean;
  index?: number;
  compact?: boolean;
  className?: string;
}) {
  return (
    <GlassCard accent="--fx-program" index={index} className={className}>
      <div className="flex items-baseline justify-between">
        <CardLabel>{compact ? "Program" : "Günün programı"}</CardLabel>
        <span className="fx-num text-[11px] text-[var(--fx-text-2)]">
          {brief.routine.done}/{brief.routine.total}
        </span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {brief.schedule.map((s) => {
          const item = s.routineItem;
          return (
            <li key={s.id} className="flex min-h-[22px] items-center gap-2.5">
              <span className="fx-num w-10 shrink-0 text-[10.5px] text-[var(--fx-text-3)]">{s.time}</span>
              <span className={cn("min-w-0 flex-1 leading-tight", compact ? "text-[13px]" : "text-[13.5px]", s.done && "text-[var(--fx-text-3)] line-through")}>
                {s.title}
              </span>
              {item && (
                <Check
                  done={Boolean(s.done)}
                  label={s.done ? `${s.title}: yapılmadı olarak işaretle` : `${s.title}: yapıldı olarak işaretle`}
                  onToggle={readOnly || !onToggle ? undefined : () => onToggle(item as RoutineItem, !s.done)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}

export function RoutineRingCard({ brief, index = 3 }: { brief: DailyBrief; index?: number }) {
  return (
    <GlassCard accent="--fx-program" index={index} className="grid place-items-center p-3">
      <Ring value={brief.routine.total ? brief.routine.done / brief.routine.total : 0} color="var(--fx-program)" size={92}>
        <span className="fx-num text-[20px] font-medium">
          {brief.routine.done}/{brief.routine.total}
        </span>
        <span className="text-[9.5px] uppercase tracking-[0.14em] text-[var(--fx-text-3)]">rutin</span>
      </Ring>
    </GlassCard>
  );
}

/** Günün sporu: koşu (6,5 km Zone 2) ya da yürüyüş (4 km + 14 dk duvar oturuşu) */
export function SportCard({ brief, index = 4 }: { brief: DailyBrief; index?: number }) {
  const run = brief.dayType === "kosu";
  const done = brief.schedule.some((s) => s.routineItem === (run ? "kosu" : "yuruyus") && s.done);
  return (
    <GlassCard accent="--fx-saglik" index={index} className="p-3.5">
      <div className="flex items-center justify-between">
        <CardLabel>{run ? "Koşu" : "Yürüyüş"}</CardLabel>
        {done && <Check done />}
      </div>
      <p className="fx-num mt-2 text-[26px] font-medium leading-none">{run ? "6,5" : "4"}</p>
      <p className="text-[11px] text-[var(--fx-text-2)]">{run ? "km · Zone 2" : "km · tempolu"}</p>
      <p className="fx-num mt-2 text-[10.5px] text-[var(--fx-text-3)]">{run ? "♥ 155–160" : "+ 14 dk duvar"}</p>
    </GlassCard>
  );
}

export function MealsCard({ brief, onEaten, readOnly, index = 8 }: { brief: DailyBrief; onEaten?: (m: BriefMeal) => void; readOnly?: boolean; index?: number }) {
  return (
    <GlassCard accent="--fx-asistan" index={index}>
      <CardLabel>Öğünler</CardLabel>
      <ul className="mt-1">
        {brief.meals.map((m) => {
          const time = brief.schedule.find((s) => s.mealType === m.mealType)?.time ?? "";
          const s = m.suggestion;
          return (
            <li key={m.mealType} className="mt-2.5 flex items-center gap-2">
              <span className="fx-num w-10 shrink-0 text-[10.5px] text-[var(--fx-text-3)]">{time}</span>
              <div className="min-w-0 flex-1">
                {m.logged ? (
                  <>
                    <p className="text-[13.5px] leading-tight text-[var(--fx-text-2)] line-through">{m.logged.name}</p>
                    <p className="text-[10.5px] text-[var(--fx-text-3)]">{m.label.toLowerCase()} · yendi</p>
                  </>
                ) : s.kind === "yok" ? (
                  <>
                    <p className="text-[13.5px] leading-tight text-[var(--fx-text-3)]">{m.label}</p>
                    <p className="truncate text-[10.5px] text-[var(--fx-text-3)]">{s.reason}</p>
                  </>
                ) : (
                  <>
                    <p className="truncate text-[13.5px] font-medium leading-tight">{s.kind === "kalan" ? `Kalan ${s.meal.name.toLocaleLowerCase("tr-TR")}` : s.meal.name}</p>
                    <p className="truncate text-[10.5px] text-[var(--fx-text-3)]">
                      {s.kind === "kalan" ? `${s.remaining} porsiyon${s.meal.reheat ? ` · ${s.meal.reheat}` : ""}` : `${s.meal.durationMin} dk${s.meal.servings > 1 ? ` · ${s.meal.servings} öğün` : ""}`}
                    </p>
                  </>
                )}
              </div>
              {!m.logged && s.kind !== "yok" && !readOnly && onEaten && (
                <button
                  type="button"
                  onClick={() => onEaten(m)}
                  className="h-8 shrink-0 rounded-full px-3 text-[11.5px] font-medium text-[var(--fx-text-2)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
                >
                  Yedim
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}

export function ChoresCard({ brief, onToggle, readOnly, index = 9 }: { brief: DailyBrief; onToggle?: BriefActions["toggleRoutine"]; readOnly?: boolean; index?: number }) {
  const slot = brief.schedule.find((s) => s.routineItem === "temizlik");
  return (
    <GlassCard accent="--fx-program" index={index} className="flex flex-col">
      <div className="flex items-center justify-between">
        <CardLabel>Temizlik</CardLabel>
        <Check
          done={brief.choreDone}
          label={brief.choreDone ? "Temizlik: yapılmadı olarak işaretle" : "Temizlik: yapıldı olarak işaretle"}
          onToggle={readOnly || !onToggle ? undefined : () => onToggle("temizlik", !brief.choreDone)}
        />
      </div>
      <ul className="mt-2 flex-1 space-y-1">
        {brief.chores.map((c) => (
          <li key={c.id} className={cn("text-[13.5px] leading-snug", brief.choreDone && "text-[var(--fx-text-3)] line-through")}>
            {c.title}
          </li>
        ))}
      </ul>
      {slot && <p className="fx-num mt-2 text-[10.5px] text-[var(--fx-text-3)]">{slot.time}</p>}
    </GlassCard>
  );
}

export function MemoryTeaser({ index = 10 }: { index?: number }) {
  const [memories, setMemories] = useState<ClientMemory[] | null>(null);
  useEffect(() => {
    fetchMemories()
      .then((r) => setMemories(r.memories))
      .catch(() => setMemories([]));
  }, []);
  const latest = memories?.[0];
  return (
    <Link href="/asistan/hafizam" className="block">
      <GlassCard accent="--fx-hafiza" index={index} className="h-full">
        <CardLabel>Hafızam</CardLabel>
        <p className="fx-num mt-2 text-[24px] leading-none">{memories ? memories.length : "–"}</p>
        <p className="text-[11px] text-[var(--fx-text-2)]">not</p>
        {latest && <p className="mt-2 line-clamp-2 text-[12px] leading-snug text-[var(--fx-text-2)]">“{latest.text}”</p>}
      </GlassCard>
    </Link>
  );
}

export function TodoCard({
  todos,
  actions,
  index = 11,
  className,
}: {
  todos: TodoItem[];
  actions?: Pick<BriefActions, "toggleTodo" | "removeTodo" | "addTodo">;
  index?: number;
  className?: string;
}) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!actions || !title.trim() || saving) return;
    setSaving(true);
    if (await actions.addTodo(title.trim(), time || null)) {
      setTitle("");
      setTime("");
    }
    setSaving(false);
  }

  return (
    <GlassCard accent="--fx-proje" index={index} className={className}>
      <div className="flex items-baseline justify-between">
        <CardLabel>Yapılacaklar</CardLabel>
        {todos.length > 0 && (
          <span className="fx-num text-[11px] text-[var(--fx-text-2)]">
            {todos.filter((t) => t.done).length}/{todos.length}
          </span>
        )}
      </div>
      {todos.length === 0 && <p className="mt-2 text-[12px] text-[var(--fx-text-3)]">Boş. Buradan ya da sohbetten eklenir.</p>}
      <ul className="mt-2 space-y-1.5">
        {todos.map((t) => (
          <li key={t.id} className="flex items-center gap-2">
            <span className="fx-num w-10 shrink-0 text-[10.5px] text-[var(--fx-text-3)]">{t.time ?? "——"}</span>
            <span className={cn("min-w-0 flex-1 truncate text-[13px]", t.done && "text-[var(--fx-text-3)] line-through")}>{t.title}</span>
            {actions && (
              <button type="button" onClick={() => actions.removeTodo(t)} aria-label={`${t.title}: sil`} className="grid h-8 w-7 shrink-0 place-items-center text-[var(--fx-text-3)]">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <Check
              done={t.done}
              label={t.done ? `${t.title}: yapılmadı olarak işaretle` : `${t.title}: yapıldı olarak işaretle`}
              onToggle={actions ? () => actions.toggleTodo(t, !t.done) : undefined}
            />
          </li>
        ))}
      </ul>
      {actions && (
        <form onSubmit={submit} className="mt-3 flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ekle…"
            maxLength={80}
            aria-label="Yapılacak"
            className="h-10 min-w-0 flex-1 rounded-[12px] bg-white/[0.05] px-3 text-[14px] outline-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] placeholder:text-[var(--fx-text-3)] focus:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Saat (isteğe bağlı)"
            className="fx-num h-10 w-[88px] rounded-[12px] bg-white/[0.05] px-2 text-[12px] outline-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
          />
          <button
            type="submit"
            disabled={saving || !title.trim()}
            aria-label="Ekle"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--fx-text)] text-black transition-opacity disabled:opacity-30"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>
      )}
    </GlassCard>
  );
}

/** Ders ve sınav özeti (Bölüm 18) — bugünün blok hedefi, bugünkü ders/sınav, sıradaki sınav; dokununca Ders sekmesi. */
export function StudyMiniCard({ brief, index = 2 }: { brief: DailyBrief; index?: number }) {
  const st = brief.study;
  if (!st || (!st.nextExam && !st.classes.length && !st.blockTarget)) return null;
  const line = st.examsToday.length
    ? `Bugün sınav: ${st.examsToday.map((e) => `${e.time} ${e.name}`).join(" · ")}`
    : st.classes.length
      ? `Ders: ${st.classes.map((c) => `${c.start} ${c.name}${c.attended ? " ✓" : ""}`).join(" · ")}`
      : st.nextExam
        ? `Sıradaki sınav: ${st.nextExam.name}`
        : "";
  return (
    <Link href="/ders" className="block">
      <GlassCard accent="--fx-ders" index={index} className="flex items-center gap-4">
        <Ring value={st.blockTarget ? st.blocksDone / st.blockTarget : 0} color="var(--fx-ders)" size={58} stroke={5}>
          <span className="fx-num text-[14px]">
            {st.blocksDone}/{st.blockTarget}
          </span>
        </Ring>
        <div className="min-w-0 flex-1">
          <CardLabel>Ders · çalışma bloğu</CardLabel>
          <p className="mt-1 truncate text-[13.5px]">{line}</p>
          {st.nextExam && !st.examsToday.length && (
            <p className="fx-num mt-0.5 text-[10.5px] text-[var(--fx-text-3)]">
              SINAV {st.nextExam.date.slice(8)}.{st.nextExam.date.slice(5, 7)} {st.nextExam.time}
            </p>
          )}
        </div>
      </GlassCard>
    </Link>
  );
}
