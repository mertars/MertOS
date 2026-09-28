"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { eachDayOfInterval, format, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { getDailyMacroTotals } from "@/lib/db/repo/meals";
import { useNutritionGoals } from "@/lib/hooks/use-nutrition-goals";

const DAYS = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });

export function WeeklyMacroChart() {
  const goals = useNutritionGoals();
  const series = useLiveQuery(async () => {
    const points = [];
    for (const day of DAYS) {
      const totals = await getDailyMacroTotals(day);
      points.push({ label: format(day, "EEEEEE", { locale: tr }), kcal: totals.kcal });
    }
    return points;
  }, []);

  if (!series || !goals) return null;
  const avg = Math.round(series.reduce((s, p) => s + p.kcal, 0) / series.length);

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">Haftalık kalori</p>
        <p className="text-[12px] text-[var(--color-text-secondary)]">Ort. {avg} kcal</p>
      </div>
      <div className="h-[130px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <XAxis dataKey="label" tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              contentStyle={{ background: "var(--color-card-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 12, fontSize: 12 }}
              formatter={(v) => [`${v} kcal`, ""]}
            />
            <ReferenceLine y={goals.kcal} stroke="var(--color-beslenme)" strokeDasharray="4 4" />
            <Bar dataKey="kcal" fill="var(--color-beslenme)" radius={[4, 4, 4, 4]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
