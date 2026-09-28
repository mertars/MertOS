"use client";

import { ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import type { CorrelationResult } from "@/lib/hooks/use-correlations";

export function CorrelationCard({ result }: { result: CorrelationResult }) {
  const enough = result.points.length >= 3;

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{result.title}</p>
        {result.r != null && <span className="text-[11px] tabular-nums-tight text-[var(--color-text-tertiary)]">r={result.r.toFixed(2)}</span>}
      </div>
      <p className="text-[12.5px] text-[var(--color-text-secondary)] mb-2">{result.description}</p>
      {enough && (
        <div className="h-[90px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <XAxis type="number" dataKey="x" hide />
              <YAxis type="number" dataKey="y" hide />
              <Scatter data={result.points} fill="var(--color-zihin)" opacity={0.75} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
