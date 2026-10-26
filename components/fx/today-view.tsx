"use client";

import Link from "next/link";
import { CloudOff, RefreshCw, Settings2 } from "lucide-react";
import type { DailyBrief } from "@/lib/assistant/daily";
import { useBrief, visibleBrief } from "@/lib/assistant/use-brief";
import { Notice, StatTile } from "./bits";
import { MicOrb } from "./mic-orb";
import { ChoresCard, DecisionCard, MealsCard, MemoryTeaser, ProgramCard, RoutineRingCard, SportCard, StudyMiniCard, TodoCard } from "./today-cards";

// Telefon — Bugün sekmesi (Faz 3). Kompozisyon: geniş karar kartı; geniş-dar
// (uzun program + rutin halkası/spor); 3x1 haftalık şerit; geniş-dar (öğün +
// temizlik); hafıza + yapılacaklar.

const WEEKDAY_SHORT: Record<string, string> = {
  Pazartesi: "Pzt",
  Salı: "Sal",
  Çarşamba: "Çar",
  Perşembe: "Per",
  Cuma: "Cum",
  Cumartesi: "Cmt",
  Pazar: "Paz",
};

function greeting(time: string): string {
  if (time < "05:00") return "İyi geceler,";
  if (time < "11:30") return "Günaydın,";
  if (time < "18:00") return "İyi günler,";
  return "İyi akşamlar,";
}

export function TodayView() {
  const { state, reload, toggleRoutine, markMealEaten, toggleTodo, removeTodo, addTodo } = useBrief();
  const { brief, readOnly } = visibleBrief(state);

  return (
    <main className="px-4 pb-10">
      <TodayHeader brief={brief} />
      {state.status === "db-yok" && (
        <Notice>Asistan veritabanı bağlı değil — Vercel&apos;e TURSO_DATABASE_URL ve TURSO_AUTH_TOKEN eklenince günlük plan burada görünür.</Notice>
      )}
      {(state.status === "cevrimdisi" || state.status === "hata") && (
        <Notice
          action={
            <button type="button" onClick={reload} aria-label="Yenile" className="grid h-9 w-9 place-items-center">
              <RefreshCw className="h-4 w-4" />
            </button>
          }
        >
          <span className="flex items-center gap-2">
            <CloudOff className="h-4 w-4 shrink-0" />
            {state.status === "cevrimdisi" ? "Çevrimdışı — son özet gösteriliyor" : state.message}
          </span>
        </Notice>
      )}
      {state.status === "yukleniyor" && <div className="fx-glass h-40 animate-pulse" />}
      {brief && (
        <>
          <div className="mb-3">
            <DecisionCard brief={brief} />
          </div>
          {brief.study && (
            <div className="mb-3">
              <StudyMiniCard brief={brief} />
            </div>
          )}
          <div className="mb-3 grid grid-cols-[1.35fr_1fr] gap-3">
            <ProgramCard brief={brief} onToggle={toggleRoutine} readOnly={readOnly} compact className="row-span-2" />
            <RoutineRingCard brief={brief} />
            <SportCard brief={brief} />
          </div>
          <div className="mb-3 grid grid-cols-3 gap-3">
            <StatTile index={5} accent="--fx-saglik" label="Koşu" value={`${brief.week.runs.done}/${brief.week.runs.planned}`} />
            <StatTile index={6} accent="--fx-hafiza" label="Yürüyüş" value={`${brief.week.walks.done}/${brief.week.walks.planned}`} />
            <StatTile index={7} accent="--fx-program" label="Rutin" value={`%${brief.week.routinePct}`} />
          </div>
          <div className="mb-3">
            <MealsCard brief={brief} onEaten={markMealEaten} readOnly={readOnly} />
          </div>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <ChoresCard brief={brief} onToggle={toggleRoutine} readOnly={readOnly} />
            <MemoryTeaser />
          </div>
          <TodoCard todos={brief.todos ?? []} actions={readOnly ? undefined : { toggleTodo, removeTodo, addTodo }} />
        </>
      )}
      {/* tek elle: sağ altta asistana konuşma kısayolu */}
      <div className="fixed bottom-[96px] right-4 z-20">
        <MicOrb size={64} active={false} href="/asistan" label="Asistana konuş" />
      </div>
    </main>
  );
}

function TodayHeader({ brief }: { brief: DailyBrief | null }) {
  const [, m, d] = (brief?.date ?? "").split("-");
  return (
    <header className="fx-enter mb-4 flex items-end justify-between pt-[max(env(safe-area-inset-top),18px)]" style={{ ["--i" as string]: 0 }}>
      <div>
        <p className="fx-num text-[11px] uppercase text-[var(--fx-text-3)]">{brief ? `${WEEKDAY_SHORT[brief.weekdayName] ?? brief.weekdayName} · ${d}.${m} · ${brief.time}` : "BUGÜN"}</p>
        <h1 className="mt-1 text-[30px] font-semibold leading-none tracking-tight">{greeting(brief?.time ?? "12:00")}</h1>
        <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-[var(--fx-text-2)]">{brief?.hitap ?? "Mert Bey"}</h1>
      </div>
      <Link
        href="/ayarlar"
        aria-label="Ayarlar"
        className="fx-glass grid h-11 w-11 place-items-center"
        style={{ ["--accent" as string]: "var(--fx-text)", ["--fx-radius" as string]: "999px" }}
      >
        <Settings2 className="h-[18px] w-[18px] text-[var(--fx-text-2)]" />
      </Link>
    </header>
  );
}
