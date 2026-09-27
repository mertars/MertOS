"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { WaterEntry } from "@/lib/db/types";

export function HourlyChart({ entries }: { entries: WaterEntry[] }) {
  const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, ml: 0 }));
  for (const e of entries) {
    const h = new Date(e.at).getHours();
    buckets[h].ml += e.amountMl;
  }

  return (
    <div className="h-[120px] -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <XAxis
            dataKey="hour"
            tickFormatter={(h) => (h % 6 === 0 ? `${h}` : "")}
            tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            contentStyle={{
              background: "var(--color-card-raised)",
              border: "1px solid var(--color-border-strong)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelFormatter={(h) => `${h}:00`}
            formatter={(v) => [`${v} ml`, ""]}
          />
          <Bar dataKey="ml" fill="var(--color-su)" radius={[4, 4, 4, 4]} maxBarSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
