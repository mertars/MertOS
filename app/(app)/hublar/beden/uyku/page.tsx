"use client";

import { Suspense, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Moon, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AutoOpenFromQuery } from "@/components/shell/auto-open-from-query";
import { AddSleepSheet } from "@/components/modules/uyku/add-sleep-sheet";
import { getSleepEntriesInRange, restoreSleepEntry, softDeleteSleepEntry } from "@/lib/db/repo/health";
import { computeIdealBedtime, computeSleepDebtMin, TARGET_SLEEP_MIN } from "@/lib/sleep/debt";
import { showUndoToast } from "@/lib/store/toast-store";

export default function UykuPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const now = new Date();
  const entries = useLiveQuery(() => getSleepEntriesInRange(subDays(now, 6), now), []);

  const last = entries?.[entries.length - 1];
  const debtMin = entries ? computeSleepDebtMin(entries) : 0;
  const idealBedtime = computeIdealBedtime(now);

  const series =
    entries?.map((e) => ({
      label: format(new Date(e.date), "EEEEEE", { locale: tr }),
      hours: Math.round((e.durationMin / 60) * 10) / 10,
    })) ?? [];

  return (
    <>
      <PageHeader eyebrow="Beden" title="Uyku" />
      <Suspense fallback={null}>
        <AutoOpenFromQuery targetPath="/hublar/beden/uyku" onOpen={() => setSheetOpen(true)} />
      </Suspense>
      <div className="px-5 mt-2 space-y-4 pb-4">
        <Card className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-uyku)]/15 shrink-0">
            <Moon className="h-5 w-5 text-[var(--color-uyku)]" />
          </span>
          <div className="flex-1">
            {last ? (
              <>
                <p className="text-[17px] font-bold tabular-nums-tight text-[var(--color-text-primary)]">
                  {Math.floor(last.durationMin / 60)} sa {last.durationMin % 60} dk
                </p>
                <p className="text-[12px] text-[var(--color-text-secondary)]">Son gece · kalite {last.quality ?? "–"}/5</p>
              </>
            ) : (
              <p className="text-[13px] text-[var(--color-text-secondary)]">Henüz uyku kaydı yok</p>
            )}
          </div>
        </Card>

        <Card>
          <p className="text-[12.5px] text-[var(--color-text-secondary)]">
            06:00 antrenmanı için ideal yatış: <span className="font-semibold text-[var(--color-text-primary)]">{format(idealBedtime, "HH:mm")}</span>
          </p>
          {debtMin > 0 && (
            <p className="text-[12.5px] text-[var(--color-warning)] mt-1">
              Son 7 günde ~{Math.round(debtMin / 60)} sa uyku borcun var
            </p>
          )}
        </Card>

        <Card>
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2">Haftalık uyku</p>
          <div className="h-[120px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <XAxis dataKey="label" tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{ background: "var(--color-card-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v) => [`${v} sa`, ""]}
                />
                <ReferenceLine y={TARGET_SLEEP_MIN / 60} stroke="var(--color-uyku)" strokeDasharray="4 4" />
                <Bar dataKey="hours" fill="var(--color-uyku)" radius={[4, 4, 4, 4]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-1">Kayıtlar</p>
          {entries && entries.length > 0 ? (
            entries
              .slice()
              .reverse()
              .map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2.5 border-b border-[var(--color-border)] last:border-0">
                  <div>
                    <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{format(new Date(e.date), "d MMM", { locale: tr })}</p>
                    <p className="text-[11.5px] text-[var(--color-text-tertiary)]">
                      {format(new Date(e.bedTime), "HH:mm")} → {format(new Date(e.wakeTime), "HH:mm")} · {Math.floor(e.durationMin / 60)} sa {e.durationMin % 60} dk
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await softDeleteSleepEntry(e.id);
                      showUndoToast("Uyku kaydı silindi", () => restoreSleepEntry(e.id));
                    }}
                    className="p-2 -m-2 text-[var(--color-text-tertiary)]"
                    aria-label="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
          ) : (
            <EmptyState icon={<Moon className="h-6 w-6" />} title="Henüz uyku kaydı yok" />
          )}
        </Card>

        <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Uyku Ekle
        </Button>
      </div>

      <AddSleepSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
