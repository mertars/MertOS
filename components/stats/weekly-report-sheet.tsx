"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { generateWeeklyReport } from "@/lib/reports/weekly";

function StoryCard({ children, accentVar }: { children: React.ReactNode; accentVar: string }) {
  return (
    <div
      className="snap-center shrink-0 w-full flex flex-col items-center justify-center gap-4 rounded-[28px] border p-6 text-center min-h-[280px]"
      style={{ borderColor: `var(${accentVar})`, background: `color-mix(in srgb, var(${accentVar}) 8%, var(--color-card))` }}
    >
      {children}
    </div>
  );
}

export function WeeklyReportSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const report = useLiveQuery(() => (open ? generateWeeklyReport() : undefined), [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Haftalık Rapor" description={report?.weekLabel}>
      {!report ? (
        <div className="h-64" />
      ) : (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
          <StoryCard accentVar="--color-hareket">
            <p className="text-[13px] text-[var(--color-text-secondary)]">Bu haftanın skoru</p>
            <p className="text-6xl font-bold tabular-nums-tight text-[var(--color-text-primary)]">{report.avgScore}</p>
            {report.changePercent != null && (
              <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                {report.changePercent >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-[var(--color-success)]" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-[var(--color-danger)]" />
                )}
                <span className={report.changePercent >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}>
                  {report.changePercent >= 0 ? "+" : ""}
                  {report.changePercent}% geçen haftaya göre
                </span>
              </div>
            )}
          </StoryCard>

          {report.bestDay && (
            <StoryCard accentVar="--color-warning">
              <Trophy className="h-8 w-8 text-[var(--color-warning)]" />
              <p className="text-[13px] text-[var(--color-text-secondary)]">En iyi günün</p>
              <p className="text-3xl font-bold capitalize text-[var(--color-text-primary)]">{report.bestDay.label}</p>
              <p className="text-[15px] font-semibold text-[var(--color-warning)]">{report.bestDay.score} puan</p>
            </StoryCard>
          )}

          <StoryCard accentVar="--color-sigara-temiz">
            <p className="text-[13px] text-[var(--color-text-secondary)]">Sigara trendi</p>
            <p className="text-5xl font-bold tabular-nums-tight text-[var(--color-text-primary)]">{report.cigThisWeek}</p>
            <p className="text-[12.5px] text-[var(--color-text-tertiary)]">
              geçen hafta {report.cigPrevWeek} adetti {report.cigThisWeek <= report.cigPrevWeek ? "🎉" : ""}
            </p>
          </StoryCard>

          {report.newRecords.length > 0 && (
            <StoryCard accentVar="--color-kondisyon">
              <Trophy className="h-8 w-8 text-[var(--color-kondisyon)]" />
              <p className="text-[13px] text-[var(--color-text-secondary)]">Bu hafta kırılan rekorlar</p>
              <div className="space-y-1">
                {report.newRecords.map((r, i) => (
                  <p key={i} className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    {r.label}
                  </p>
                ))}
              </div>
            </StoryCard>
          )}

          <StoryCard accentVar="--color-zihin">
            <p className="text-[13px] text-[var(--color-text-secondary)]">Gelecek haftaya 3 odak</p>
            <div className="space-y-2.5 text-left w-full">
              {report.focusAreas.map((f) => (
                <div key={f.ring} className="rounded-xl bg-white/5 px-3 py-2">
                  <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{f.label}</p>
                  <p className="text-[11.5px] text-[var(--color-text-secondary)]">{f.advice}</p>
                </div>
              ))}
            </div>
          </StoryCard>
        </div>
      )}
    </Sheet>
  );
}
