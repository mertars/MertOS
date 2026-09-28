"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { format, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Wind } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BreathingExercise } from "@/components/modules/zihin/breathing-exercise";
import { getMoodEntriesInRange } from "@/lib/db/repo/zihin";

export default function StresPage() {
  const now = new Date();
  const entries = useLiveQuery(() => getMoodEntriesInRange(subDays(now, 29), now), []);

  const byDay = new Map<string, number[]>();
  for (const e of entries ?? []) {
    const key = format(new Date(e.at), "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e.stress);
  }
  const series = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      label: format(new Date(date), "d MMM", { locale: tr }),
      stress: Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10,
    }));

  const avgStress = series.length > 0 ? Math.round((series.reduce((s, p) => s + p.stress, 0) / series.length) * 10) / 10 : null;

  return (
    <>
      <PageHeader eyebrow="Zihin" title="Stres" />
      <div className="px-5 mt-2 space-y-4 pb-4">
        <Card>
          <BreathingExercise />
        </Card>

        {series.length > 1 ? (
          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">Stres trendi (30 gün)</p>
              {avgStress && <p className="text-[12px] text-[var(--color-text-secondary)]">Ort. {avgStress}/5</p>}
            </div>
            <div className="h-[120px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <XAxis dataKey="label" tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
                  <YAxis hide domain={[0, 5]} />
                  <Tooltip contentStyle={{ background: "var(--color-card-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="stress" fill="var(--color-zihin)" radius={[4, 4, 4, 4]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : (
          <EmptyState icon={<Wind className="h-6 w-6" />} title="Henüz yeterli veri yok" description="Ruh Hali & Enerji'den kayıt tuttukça burada stres trendini göreceksin." />
        )}
      </div>
    </>
  );
}
