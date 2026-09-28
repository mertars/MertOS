"use client";

import { Suspense, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { AutoOpenFromQuery } from "@/components/shell/auto-open-from-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MoodQuickSheet } from "@/components/modules/zihin/mood-quick-sheet";
import { getMoodEntriesForDate, getMoodEntriesInRange, restoreMoodEntry, softDeleteMoodEntry } from "@/lib/db/repo/zihin";
import { showUndoToast } from "@/lib/store/toast-store";

export default function RuhHaliPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const now = new Date();
  const rangeEntries = useLiveQuery(() => getMoodEntriesInRange(subDays(now, 13), now), []);
  const todayEntries = useLiveQuery(() => getMoodEntriesForDate(), []);

  const series = (rangeEntries ?? []).map((e) => ({
    label: format(new Date(e.at), "d MMM", { locale: tr }),
    mood: e.mood,
    energy: e.energy,
  }));

  return (
    <>
      <PageHeader eyebrow="Zihin" title="Ruh Hali & Enerji" />
      <Suspense fallback={null}>
        <AutoOpenFromQuery targetPath="/hublar/zihin/ruh-hali" onOpen={() => setSheetOpen(true)} />
      </Suspense>
      <div className="px-5 mt-2 space-y-4 pb-4">
        <Button variant="accent" accentVar="--color-zihin" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Şu An Nasılsın?
        </Button>

        {series.length > 1 ? (
          <Card>
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2">Son 14 gün</p>
            <div className="h-[130px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <XAxis dataKey="label" tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
                  <YAxis hide domain={[1, 5]} />
                  <Tooltip contentStyle={{ background: "var(--color-card-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 12, fontSize: 12 }} />
                  <Line type="monotone" dataKey="mood" stroke="var(--color-zihin)" strokeWidth={2.5} dot={false} name="Ruh hali" />
                  <Line type="monotone" dataKey="energy" stroke="var(--color-warning)" strokeWidth={2} dot={false} name="Enerji" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Henüz yeterli veri yok" description="Günde birkaç kez hızlı kayıt tut." />
        )}

        <Card>
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-1">Bugün</p>
          {todayEntries && todayEntries.length > 0 ? (
            todayEntries.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                <span className="text-[13px] text-[var(--color-text-secondary)]">{format(new Date(e.at), "HH:mm")}</span>
                <span className="text-[12.5px] text-[var(--color-text-primary)]">
                  Ruh hali {e.mood}/5 · Enerji {e.energy}/5 · Stres {e.stress}/5
                </span>
                <button
                  onClick={async () => {
                    await softDeleteMoodEntry(e.id);
                    showUndoToast("Kayıt silindi", () => restoreMoodEntry(e.id));
                  }}
                  className="p-2 -m-2 text-[var(--color-text-tertiary)]"
                  aria-label="Sil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-[12.5px] text-[var(--color-text-tertiary)] py-2">Bugün henüz kayıt yok</p>
          )}
        </Card>
      </div>

      <MoodQuickSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
