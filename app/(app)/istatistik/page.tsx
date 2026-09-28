"use client";

import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp, CalendarRange } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { LevelCard } from "@/components/stats/level-card";
import { BadgesGrid } from "@/components/stats/badges-grid";
import { WeeklyReportSheet } from "@/components/stats/weekly-report-sheet";
import { CorrelationCard } from "@/components/stats/correlation-card";
import { useScoreTrend } from "@/lib/hooks/use-score-trend";
import { useCorrelations } from "@/lib/hooks/use-correlations";

const RANGE_OPTIONS = [
  { value: "7", label: "7 gün" },
  { value: "30", label: "30 gün" },
  { value: "90", label: "90 gün" },
];

export default function IstatistikPage() {
  const [range, setRange] = useState("30");
  const [reportOpen, setReportOpen] = useState(false);
  const trend = useScoreTrend(Number(range));
  const correlations = useCorrelations(Number(range));

  return (
    <>
      <PageHeader eyebrow="MertOS" title="İstatistik" />
      <div className="px-5 mt-2 space-y-4 pb-4">
        <LevelCard />

        <Button variant="secondary" className="w-full" onClick={() => setReportOpen(true)}>
          <CalendarRange className="h-4 w-4" />
          Haftalık Raporu Gör
        </Button>

        <BadgesGrid />

        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">Skor trendi</p>
            {trend?.changePercent != null && (
              <span
                className={`flex items-center gap-1 text-[12px] font-semibold ${trend.changePercent >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}
              >
                {trend.changePercent >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {trend.changePercent >= 0 ? "+" : ""}
                {trend.changePercent}%
              </span>
            )}
          </div>
          <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} className="mb-3" />
          {trend && (
            <div className="h-[130px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend.points} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <XAxis dataKey="label" tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={40} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "var(--color-card-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 12, fontSize: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="var(--color-hareket)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-2">Ortalama {trend?.avg ?? "–"} · önceki dönem {trend?.prevAvg ?? "–"}</p>
        </Card>

        <div>
          <p className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-2 px-1">Korelasyonlar</p>
          <div className="space-y-3">
            {correlations?.map((c) => <CorrelationCard key={c.id} result={c} />)}
          </div>
        </div>
      </div>

      <WeeklyReportSheet open={reportOpen} onOpenChange={setReportOpen} />
    </>
  );
}
