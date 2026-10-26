"use client";

import { useEffect, useState } from "react";
import { fetchHealthHistory } from "@/lib/assistant/client";
import type { DailyBrief, DayHistory } from "@/lib/assistant/daily";
import { cn } from "@/lib/utils";
import { MiniBar, Ring } from "./bits";
import { CardLabel, GlassCard } from "./glass-card";

// Sağlık kartları (Faz 3) — Sağlık sekmesi ve bilgisayarda sol sütun.
// Veri: günlük motorun haftalık tutarlılığı + /api/assistant/health geçmişi.

const WEEKDAY_SHORT = ["P", "S", "Ç", "P", "C", "C", "P"]; // getUTCDay: 0 = Pazar

export function useHealthHistory(days = 14) {
  const [history, setHistory] = useState<DayHistory[] | null>(null);
  useEffect(() => {
    fetchHealthHistory(days)
      .then((r) => setHistory(r.days))
      .catch(() => setHistory([]));
  }, [days]);
  return history;
}

export function WeekCard({ brief, index = 1 }: { brief: DailyBrief; index?: number }) {
  const w = brief.week;
  return (
    <GlassCard accent="--fx-saglik" index={index} className="p-5">
      <CardLabel>Sağlık · bu hafta</CardLabel>
      <div className="mt-4 flex items-center gap-5">
        <Ring value={w.runs.planned ? w.runs.done / w.runs.planned : 0} color="var(--fx-saglik)" size={104}>
          <span className="fx-num text-[22px]">
            {w.runs.done}/{w.runs.planned}
          </span>
          <span className="text-[9.5px] uppercase tracking-[0.14em] text-[var(--fx-text-3)]">koşu</span>
        </Ring>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <MiniBar label="Yürüyüş" value={`${w.walks.done}/${w.walks.planned}`} ratio={w.walks.planned ? w.walks.done / w.walks.planned : 0} color="--fx-hafiza" />
          <MiniBar label="Rutin" value={`%${w.routinePct}`} ratio={w.routinePct / 100} color="--fx-program" />
          <MiniBar
            label="Öğün kaydı"
            value={`${w.mealLogs.count}/${w.mealLogs.expected}`}
            ratio={w.mealLogs.expected ? w.mealLogs.count / w.mealLogs.expected : 0}
            color="--fx-asistan"
          />
        </div>
      </div>
    </GlassCard>
  );
}

export function TodaySportTiles({ brief, index = 2 }: { brief: DailyBrief; index?: number }) {
  const run = brief.dayType === "kosu";
  return (
    <div className="grid grid-cols-2 gap-3 lg:gap-4">
      <GlassCard accent="--fx-saglik" index={index}>
        <CardLabel>Bugün</CardLabel>
        <p className="fx-num mt-2 text-[26px] leading-none">{run ? "6,5" : "4"}</p>
        <p className="text-[11.5px] text-[var(--fx-text-2)]">{run ? "km Zone 2 koşu" : "km yürüyüş + 14 dk duvar"}</p>
      </GlassCard>
      <GlassCard accent="--fx-saglik" index={index + 1}>
        <CardLabel>Nabız hedefi</CardLabel>
        <p className="fx-num mt-2 text-[21px] leading-none">155–160</p>
        <p className="text-[11.5px] text-[var(--fx-text-2)]">Zone 2 üst sınır</p>
      </GlassCard>
    </div>
  );
}

/** Son 7 gün: sütun = rutin doluluğu, üstteki nokta = günün sporu yapıldı. */
export function HistoryCard({ history, index = 4, className }: { history: DayHistory[] | null; index?: number; className?: string }) {
  const last7 = (history ?? []).slice(-7);
  const sport = last7.filter((d) => d.sportDone).length;
  return (
    <GlassCard accent="--fx-saglik" index={index} className={className}>
      <div className="flex items-baseline justify-between">
        <CardLabel>Son 7 gün</CardLabel>
        <span className="fx-num text-[11px] text-[var(--fx-text-2)]">{history ? `${sport}/7 spor` : ""}</span>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {(history ? last7 : Array.from({ length: 7 }, () => null)).map((d, i) => {
          const ratio = d && d.routineTotal ? d.routineDone / d.routineTotal : 0;
          return (
            <div key={d?.date ?? i} className="flex flex-col items-center gap-2">
              <span className={cn("h-1.5 w-1.5 rounded-full", d?.sportDone ? "bg-[var(--fx-saglik)]" : "bg-white/10")} />
              <div className="relative h-24 w-full overflow-hidden rounded-[10px] bg-white/[0.04]">
                <div
                  className="absolute inset-x-0 bottom-0 rounded-[10px] transition-[height] duration-700"
                  style={{ height: `${ratio * 100}%`, background: "linear-gradient(180deg, var(--fx-saglik), color-mix(in srgb, var(--fx-saglik) 30%, black))" }}
                />
              </div>
              <span className="fx-num text-[10px] text-[var(--fx-text-3)]">{d ? WEEKDAY_SHORT[new Date(`${d.date}T12:00:00Z`).getUTCDay()] : "·"}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[12px] leading-snug text-[var(--fx-text-3)]">Sütun: rutinin yapılan kısmı · nokta: günün koşusu/yürüyüşü yapıldı.</p>
    </GlassCard>
  );
}
