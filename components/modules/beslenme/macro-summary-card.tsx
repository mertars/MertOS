"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Card } from "@/components/ui/card";
import { ProgressBar, StatNumber } from "@/components/ui/stat";
import { getDailyMacroTotals } from "@/lib/db/repo/meals";
import { useNutritionGoals } from "@/lib/hooks/use-nutrition-goals";
import { macroPercent } from "@/lib/nutrition/tdee";

const MACRO_META = [
  { key: "proteinG" as const, label: "Protein", unit: "g", colorVar: "--color-beslenme" },
  { key: "carbG" as const, label: "Karbonhidrat", unit: "g", colorVar: "--color-su" },
  { key: "fatG" as const, label: "Yağ", unit: "g", colorVar: "--color-warning" },
];

export function MacroSummaryCard() {
  const goals = useNutritionGoals();
  const totals = useLiveQuery(() => getDailyMacroTotals(), []);

  if (!goals || !totals) return null;

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">Bugünkü makrolar</p>
        {goals.isTrainingDay && <span className="text-[10.5px] font-medium text-[var(--color-hareket)]">Antrenman günü +karb</span>}
      </div>
      <div className="flex items-baseline gap-2 mb-4">
        <StatNumber value={totals.kcal} size="lg" />
        <span className="text-[13px] text-[var(--color-text-secondary)]">/ {goals.kcal} kcal</span>
      </div>
      <div className="space-y-3">
        {MACRO_META.map((m) => (
          <div key={m.key}>
            <div className="flex justify-between text-[12px] mb-1">
              <span className="text-[var(--color-text-secondary)]">{m.label}</span>
              <span className="tabular-nums-tight text-[var(--color-text-tertiary)]">
                {totals[m.key]} / {goals[m.key]} {m.unit}
              </span>
            </div>
            <ProgressBar value={macroPercent(totals[m.key], goals[m.key])} colorVar={m.colorVar} />
          </div>
        ))}
      </div>
    </Card>
  );
}
