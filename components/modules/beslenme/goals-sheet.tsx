"use client";

import { Sheet } from "@/components/ui/sheet";
import { Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useLiveQuery } from "dexie-react-hooks";
import { getNutritionSettings } from "@/lib/db";
import { updateNutritionSettings } from "@/lib/db/repo/meals";
import type { ActivityLevel, NutritionGoalMode } from "@/lib/db/types";

const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  1: "Sedanter",
  2: "Hafif aktif",
  3: "Orta aktif",
  4: "Çok aktif",
  5: "Ekstra aktif",
};

export function GoalsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const settings = useLiveQuery(() => getNutritionSettings(), []);

  if (!settings) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Beslenme Hedefleri">
      <div className="space-y-5">
        <div>
          <Label>Hedef mod</Label>
          <Segmented
            options={[
              { value: "koru", label: "Koru" },
              { value: "hafif_bulk", label: "Hafif Bulk" },
              { value: "cut", label: "Cut" },
            ]}
            value={settings.mode}
            onChange={(v: NutritionGoalMode) => updateNutritionSettings({ mode: v })}
          />
        </div>

        <div>
          <Label>Aktivite seviyesi</Label>
          <div className="grid grid-cols-5 gap-1.5">
            {([1, 2, 3, 4, 5] as ActivityLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => updateNutritionSettings({ activityLevel: lvl })}
                className={`rounded-xl py-2 text-[10.5px] font-medium min-h-11 ${
                  settings.activityLevel === lvl
                    ? "bg-[var(--color-beslenme)] text-black"
                    : "bg-[var(--color-card-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                }`}
              >
                {ACTIVITY_LABEL[lvl]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="mb-0">Protein hedefi (g / kg)</Label>
            <span className="text-[13px] font-semibold text-[var(--color-text-primary)] tabular-nums-tight">{settings.proteinGPerKg}</span>
          </div>
          <input
            type="range"
            min={1}
            max={2.5}
            step={0.1}
            value={settings.proteinGPerKg}
            onChange={(e) => updateNutritionSettings({ proteinGPerKg: Number(e.target.value) })}
            className="w-full accent-[var(--color-beslenme)]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="mb-0">Antrenman günü karbonhidrat artışı</Label>
            <span className="text-[13px] font-semibold text-[var(--color-text-primary)] tabular-nums-tight">
              +%{settings.carbBoostOnTrainingDayPct}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={40}
            step={5}
            value={settings.carbBoostOnTrainingDayPct}
            onChange={(e) => updateNutritionSettings({ carbBoostOnTrainingDayPct: Number(e.target.value) })}
            className="w-full accent-[var(--color-beslenme)]"
          />
        </div>
      </div>
    </Sheet>
  );
}
