"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { eachDayOfInterval, format, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Footprints, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { getActivityForDate, getActivityInRange, upsertActivityDaily } from "@/lib/db/repo/health";

const DAYS = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
const STEP_GOAL = 8000;

export default function AktivitePage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [steps, setSteps] = useState("");
  const [energy, setEnergy] = useState("");

  const today = useLiveQuery(() => getActivityForDate(), []);
  const range = useLiveQuery(() => getActivityInRange(subDays(new Date(), 6), new Date()), []);

  const series = DAYS.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    const row = range?.find((r) => r.date === key);
    return { label: format(d, "EEEEEE", { locale: tr }), steps: row?.steps ?? 0 };
  });

  async function handleSave() {
    await upsertActivityDaily(new Date(), { steps: steps ? Number(steps) : undefined, activeEnergyKcal: energy ? Number(energy) : undefined });
    setSheetOpen(false);
    setSteps("");
    setEnergy("");
  }

  const pct = today?.steps ? Math.min(100, Math.round((today.steps / STEP_GOAL) * 100)) : 0;

  return (
    <>
      <PageHeader eyebrow="Beden" title="Aktivite" />
      <div className="px-5 mt-2 space-y-4 pb-4">
        <Card className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-hareket)]/12 shrink-0">
            <Footprints className="h-5 w-5 text-[var(--color-hareket)]" />
          </span>
          <div className="flex-1">
            <p className="text-[17px] font-bold tabular-nums-tight text-[var(--color-text-primary)]">
              {(today?.steps ?? 0).toLocaleString("tr-TR")} <span className="text-[13px] font-semibold text-[var(--color-text-secondary)]">/ {STEP_GOAL.toLocaleString("tr-TR")} adım</span>
            </p>
            {today?.activeEnergyKcal != null && <p className="text-[12px] text-[var(--color-text-secondary)]">{today.activeEnergyKcal} kcal aktif enerji</p>}
          </div>
          <span className="text-[13px] font-bold text-[var(--color-hareket)]">{pct}%</span>
        </Card>

        <Card>
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2">Haftalık adım</p>
          <div className="h-[120px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <XAxis dataKey="label" tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{ background: "var(--color-card-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v) => [`${v} adım`, ""]}
                />
                <Bar dataKey="steps" fill="var(--color-hareket)" radius={[4, 4, 4, 4]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Elle Ekle
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Aktivite Ekle">
        <div className="space-y-4">
          <div>
            <Label>Adım</Label>
            <Input inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} />
          </div>
          <div>
            <Label>Aktif enerji (kcal)</Label>
            <Input inputMode="numeric" value={energy} onChange={(e) => setEnergy(e.target.value)} placeholder="opsiyonel" />
          </div>
          <Button variant="accent" accentVar="--color-hareket" className="w-full" onClick={handleSave}>
            Kaydet
          </Button>
        </div>
      </Sheet>
    </>
  );
}
