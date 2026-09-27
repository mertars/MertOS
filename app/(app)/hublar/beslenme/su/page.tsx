"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Droplets, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { WaterVisual } from "@/components/modules/su/water-visual";
import { HourlyChart } from "@/components/modules/su/hourly-chart";
import { WaterEntryRow } from "@/components/modules/su/water-entry-row";
import { addWaterEntry, getWaterEntriesForDay, softDeleteWaterEntry } from "@/lib/db/repo/water";
import { getWorkoutsForDate } from "@/lib/db/repo/workouts";
import { useProfile } from "@/lib/hooks/db-hooks";
import { computeWaterGoalMl, computeYakitRing } from "@/lib/scoring/engine";
import { showUndoToast } from "@/lib/store/toast-store";

const QUICK_AMOUNTS = [200, 250, 330, 500];

export default function SuPage() {
  const profile = useProfile();
  const entries = useLiveQuery(() => getWaterEntriesForDay(), []);
  const trainedToday = useLiveQuery(async () => (await getWorkoutsForDate()).length > 0, []) ?? false;
  const [customAmount, setCustomAmount] = useState("");

  const goal = computeWaterGoalMl(profile?.weightKg, trainedToday);
  const total = entries?.reduce((s, e) => s + e.amountMl, 0) ?? 0;
  const percent = computeYakitRing(total, goal);

  async function handleAdd(amount: number) {
    if (amount <= 0) return;
    const id = await addWaterEntry(amount);
    showUndoToast(`${amount} ml su eklendi`, () => softDeleteWaterEntry(id));
  }

  return (
    <>
      <PageHeader eyebrow="Beslenme" title="Su" />
      <div className="px-5 mt-2 space-y-5">
        <Card className="flex flex-col items-center gap-5 py-6">
          <WaterVisual percent={percent} />
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums-tight text-[var(--color-text-primary)]">
              {total} <span className="text-[var(--color-text-secondary)] text-base font-semibold">/ {goal} ml</span>
            </p>
            <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5">
              {trainedToday ? "Antrenman günü hedefi (+500 ml)" : "Günlük hedef"}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 w-full">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => handleAdd(amt)}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-[var(--color-card-raised)] border border-[var(--color-border)] py-3 active:scale-95 transition-transform min-h-14"
              >
                <Droplets className="h-3.5 w-3.5 text-[var(--color-su)]" />
                <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{amt}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Özel miktar (ml)"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="flex-1"
            />
            <Button
              size="icon"
              variant="accent"
              accentVar="--color-su"
              onClick={() => {
                handleAdd(Number(customAmount));
                setCustomAmount("");
              }}
              aria-label="Ekle"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        <Card>
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2">Saatlik dağılım</p>
          <HourlyChart entries={entries ?? []} />
        </Card>

        <Card>
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-1">Bugünkü kayıtlar</p>
          {entries && entries.length > 0 ? (
            entries
              .slice()
              .reverse()
              .map((e) => <WaterEntryRow key={e.id} entry={e} />)
          ) : (
            <EmptyState
              icon={<Droplets className="h-6 w-6" />}
              title="Henüz su kaydı yok"
              description="Yukarıdaki butonlarla hızlıca ekleyebilirsin."
            />
          )}
        </Card>
      </div>
    </>
  );
}
