"use client";

import Link from "next/link";
import { CloudOff } from "lucide-react";
import { useBrief, visibleBrief } from "@/lib/assistant/use-brief";
import { AssistantPanel } from "./assistant-panel";
import { Notice } from "./bits";
import { CardLabel, GlassCard } from "./glass-card";
import { HistoryCard, TodaySportTiles, useHealthHistory, WeekCard } from "./health-cards";
import { DecisionCard, ProgramCard, StudyMiniCard, TodoCard } from "./today-cards";

// Bilgisayar ana görünümü (Faz 3): tüm ekran, sayfa kaydırması yok.
// Sol: sağlık. Orta: büyük mikrofon, altında sohbet. Sağ: günün kararı,
// programı ve projeler. Uzun listeler kendi kartı içinde kayar.

export function DesktopHome() {
  const { state, toggleRoutine, toggleTodo, removeTodo, addTodo } = useBrief();
  const { brief, readOnly } = visibleBrief(state);
  const history = useHealthHistory(14);

  return (
    <div className="grid h-[calc(100dvh-4rem)] grid-cols-[minmax(300px,1fr)_minmax(440px,1.3fr)_minmax(300px,1fr)] gap-5 px-7 pb-7">
      {/* Sol: sağlık */}
      <div className="flex min-h-0 flex-col gap-4">
        {state.status === "db-yok" && <Notice>Asistan veritabanı bağlı değil (TURSO_DATABASE_URL).</Notice>}
        {state.status === "cevrimdisi" && (
          <Notice>
            <span className="flex items-center gap-2">
              <CloudOff className="h-4 w-4" /> Çevrimdışı — son özet
            </span>
          </Notice>
        )}
        {brief && <WeekCard brief={brief} />}
        {brief && <TodaySportTiles brief={brief} />}
        <HistoryCard history={history} />
        {brief && (
          <TodoCard
            todos={brief.todos ?? []}
            actions={readOnly ? undefined : { toggleTodo, removeTodo, addTodo }}
            index={5}
            className="min-h-0 flex-1 overflow-y-auto"
          />
        )}
      </div>

      {/* Orta: mikrofon + sohbet */}
      <div className="min-h-0">
        <AssistantPanel layout="desktop" />
      </div>

      {/* Sağ: günün programı + projeler */}
      <div className="flex min-h-0 flex-col gap-4">
        {brief && <DecisionCard brief={brief} large={false} index={2} />}
        {brief && <ProgramCard brief={brief} onToggle={toggleRoutine} readOnly={readOnly} index={3} className="min-h-0 flex-1 overflow-y-auto" />}
        {brief && <StudyMiniCard brief={brief} index={4} />}
        <ProjectsCard index={5} />
      </div>
    </div>
  );
}

export function ProjectsCard({ index = 4 }: { index?: number }) {
  return (
    <GlassCard accent="--fx-proje" index={index}>
      <div className="flex items-baseline justify-between">
        <CardLabel>Projeler</CardLabel>
        <span className="fx-num text-[10.5px] text-[var(--fx-text-3)]">FAZ 5</span>
      </div>
      <p className="mt-2 text-[13px] leading-snug text-[var(--fx-text-2)]">GitHub projelerinin durumu Faz 5&apos;te burada görünecek.</p>
      <Link href="/projeler" className="mt-3 inline-block text-[12.5px] font-medium text-[color-mix(in_srgb,var(--fx-proje)_80%,white)]">
        Projeler sekmesi →
      </Link>
    </GlassCard>
  );
}
