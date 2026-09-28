"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HeartPulse, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AddHeartSheet } from "@/components/modules/kalp/add-heart-sheet";
import { getHeartMetricsInRange } from "@/lib/db/repo/health";

export default function KalpPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const now = new Date();
  const entries = useLiveQuery(() => getHeartMetricsInRange(subDays(now, 29), now), []);
  const latest = entries?.[entries.length - 1];

  const series = (entries ?? []).map((e) => ({
    label: format(new Date(e.date), "d MMM", { locale: tr }),
    restingHr: e.restingHr,
    hrv: e.hrv,
  }));

  return (
    <>
      <PageHeader eyebrow="Beden" title="Kalp" />
      <div className="px-5 mt-2 space-y-4 pb-4">
        <div className="grid grid-cols-3 gap-2.5">
          <MiniStat label="Dinlenik" value={latest?.restingHr} unit="bpm" />
          <MiniStat label="HRV" value={latest?.hrv} unit="ms" />
          <MiniStat label="VO2max" value={latest?.vo2max} unit="" />
        </div>

        {series.length > 1 ? (
          <Card>
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2">Dinlenik nabız trendi (30 gün)</p>
            <div className="h-[130px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <XAxis dataKey="label" tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
                  <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-card-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 12, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="restingHr" stroke="var(--color-kondisyon)" strokeWidth={2.5} dot={false} name="Dinlenik nabız" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState icon={<HeartPulse className="h-6 w-6" />} title="Henüz yeterli veri yok" description="Elle ekle ya da Apple Sağlık'tan içe aktar." />
          </Card>
        )}

        <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Kalp Verisi Ekle
        </Button>
      </div>

      <AddHeartSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}

function MiniStat({ label, value, unit }: { label: string; value?: number; unit: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-center">
      <p className="text-[17px] font-bold tabular-nums-tight text-[var(--color-kondisyon)]">{value ?? "–"}</p>
      <p className="text-[10.5px] text-[var(--color-text-secondary)] mt-0.5">
        {label} {unit}
      </p>
    </div>
  );
}
