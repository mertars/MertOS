"use client";

import { useMemo } from "react";
import { eachWeekOfInterval, endOfWeek, format, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { useLiveQuery } from "dexie-react-hooks";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getCigaretteEntriesInRange } from "@/lib/db/repo/cigarette";
import { getWorkoutsInRange } from "@/lib/db/repo/workouts";
import { useCigaretteSettings } from "@/lib/hooks/db-hooks";
import { TRIGGER_LABELS, TRIGGER_LIST } from "@/lib/cigarette/triggers";
import { BarChart3 } from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function AnalizTab() {
  const settings = useCigaretteSettings();
  const now = useMemo(() => new Date(), []);
  const rangeStart = useMemo(() => subDays(now, 29), [now]);

  const entries = useLiveQuery(() => getCigaretteEntriesInRange(rangeStart, now), [rangeStart]);
  const workouts = useLiveQuery(() => getWorkoutsInRange(rangeStart, now), [rangeStart]);

  if (!settings || !entries) return null;

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-6 w-6" />}
        title="Henüz yeterli veri yok"
        description="Birkaç gün kayıt tuttukça burada ısı haritası, tetikleyici dağılımı ve trendler görünecek."
      />
    );
  }

  // Saat ısı haritası (son 30 gün)
  const hourCounts = HOURS.map(() => 0);
  for (const e of entries) hourCounts[new Date(e.at).getHours()]++;
  const maxHour = Math.max(1, ...hourCounts);

  // Tetikleyici dağılımı
  const triggerCounts = TRIGGER_LIST.map((t) => ({ t, count: entries.filter((e) => e.trigger === t).length }));
  const untaggedCount = entries.filter((e) => !e.trigger).length;
  const maxTrigger = Math.max(1, ...triggerCounts.map((t) => t.count), untaggedCount);

  // Haftalık trend (son 6 hafta)
  const weeks = eachWeekOfInterval(
    { start: subDays(now, 41), end: now },
    { weekStartsOn: 1 },
  ).map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const count = entries.filter((e) => {
      const t = new Date(e.at).getTime();
      return t >= weekStart.getTime() && t <= weekEnd.getTime();
    }).length;
    return { label: format(weekStart, "d MMM", { locale: tr }), count };
  });

  // Para
  const unitPrice = settings.cigsPerPack > 0 ? settings.packPrice / settings.cigsPerPack : 0;
  const todayCount = entries.filter((e) => format(new Date(e.at), "yyyy-MM-dd") === format(now, "yyyy-MM-dd")).length;
  const monthCount = entries.length; // son 30 gün penceresi zaten ~1 ay
  const dailySpend = todayCount * unitPrice;
  const monthlySpend = monthCount * unitPrice;
  const yearlySpend = (monthlySpend / 30) * 365;
  const savedVsBaseline = Math.max(0, settings.baselineAvgPerDay * 30 - monthCount) * unitPrice;

  // Antrenman günü vs dinlenme günü sigara ortalaması (kondisyon skoruna yaklaşık proxy)
  const trainedDates = new Set((workouts ?? []).map((w) => w.date));
  const byDate = new Map<string, number>();
  for (const e of entries) {
    const key = format(new Date(e.at), "yyyy-MM-dd");
    byDate.set(key, (byDate.get(key) ?? 0) + 1);
  }
  let trainedTotal = 0;
  let trainedDays = 0;
  let restTotal = 0;
  let restDays = 0;
  for (let d = 0; d < 30; d++) {
    const day = subDays(now, d);
    const key = format(day, "yyyy-MM-dd");
    const count = byDate.get(key) ?? 0;
    if (trainedDates.has(key)) {
      trainedTotal += count;
      trainedDays++;
    } else {
      restTotal += count;
      restDays++;
    }
  }
  const trainedAvg = trainedDays ? trainedTotal / trainedDays : 0;
  const restAvg = restDays ? restTotal / restDays : 0;

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">Saat ısı haritası (30 gün)</p>
        <div className="grid grid-cols-12 gap-1.5">
          {HOURS.map((h) => (
            <div key={h} className="flex flex-col items-center gap-1">
              <div
                className="w-full aspect-square rounded-[6px]"
                style={{ backgroundColor: `color-mix(in srgb, var(--color-sigara) ${Math.round((hourCounts[h] / maxHour) * 90) + (hourCounts[h] ? 10 : 0)}%, var(--color-card-raised))` }}
                title={`${h}:00 — ${hourCounts[h]} adet`}
              />
              {h % 4 === 0 && <span className="text-[8px] text-[var(--color-text-tertiary)]">{h}</span>}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">Tetikleyici dağılımı</p>
        <div className="space-y-2.5">
          {[...triggerCounts, { t: null, count: untaggedCount }]
            .filter((row) => row.count > 0)
            .sort((a, b) => b.count - a.count)
            .map((row) => (
              <div key={row.t ?? "yok"} className="flex items-center gap-3">
                <span className="w-24 text-[12px] text-[var(--color-text-secondary)] shrink-0">
                  {row.t ? TRIGGER_LABELS[row.t] : "Belirtilmedi"}
                </span>
                <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-sigara)]"
                    style={{ width: `${(row.count / maxTrigger) * 100}%` }}
                  />
                </div>
                <span className="text-[12px] tabular-nums-tight text-[var(--color-text-tertiary)] w-6 text-right">
                  {row.count}
                </span>
              </div>
            ))}
        </div>
      </Card>

      <Card>
        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2">Haftalık trend</p>
        <div className="h-[110px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                contentStyle={{
                  background: "var(--color-card-raised)",
                  border: "1px solid var(--color-border-strong)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v) => [`${v} adet`, ""]}
              />
              <Bar dataKey="count" fill="var(--color-sigara)" radius={[4, 4, 4, 4]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">Para</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <MoneyStat label="Bugün" value={dailySpend} />
          <MoneyStat label="30 gün" value={monthlySpend} />
          <MoneyStat label="Yıllık tahmini" value={yearlySpend} />
        </div>
        {savedVsBaseline > 0 && (
          <p className="text-[12.5px] text-[var(--color-sigara-temiz)] font-medium mb-3">
            Başlangıç ortalamana göre son 30 günde ~{savedVsBaseline.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL biriktirdin
          </p>
        )}
        <div className="space-y-2">
          {settings.goalItems.map((g) => {
            const pct = Math.min(100, Math.round((savedVsBaseline / g.priceTl) * 100));
            return (
              <div key={g.id}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="text-[var(--color-text-secondary)]">{g.label}</span>
                  <span className="text-[var(--color-text-tertiary)]">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--color-finans)]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {trainedDays > 0 && restDays > 0 && (
        <Card>
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-1">Antrenman & sigara ilişkisi</p>
          <p className="text-[11.5px] text-[var(--color-text-tertiary)] mb-3">Son 30 gün, günlük ortalama adet</p>
          <div className="flex gap-4">
            <div className="flex-1 text-center rounded-2xl bg-[var(--color-card-raised)] py-3">
              <p className="text-xl font-bold text-[var(--color-hareket)] tabular-nums-tight">{trainedAvg.toFixed(1)}</p>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">Antrenman günü</p>
            </div>
            <div className="flex-1 text-center rounded-2xl bg-[var(--color-card-raised)] py-3">
              <p className="text-xl font-bold text-[var(--color-text-primary)] tabular-nums-tight">{restAvg.toFixed(1)}</p>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">Dinlenme günü</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function MoneyStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center rounded-2xl bg-[var(--color-card-raised)] py-3">
      <p className="text-[15px] font-bold tabular-nums-tight text-[var(--color-finans)]">
        {value.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
      </p>
      <p className="text-[10.5px] text-[var(--color-text-secondary)] mt-0.5">{label}</p>
    </div>
  );
}
