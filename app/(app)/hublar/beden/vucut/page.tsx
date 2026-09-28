"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus, Scale, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AddBodySheet } from "@/components/modules/vucut/add-body-sheet";
import { getBodyMetricsInRange, getBodyPhotoBlob, restoreBodyMetric, softDeleteBodyMetric } from "@/lib/db/repo/health";
import { useBlobUrl } from "@/lib/hooks/use-blob-url";
import { showUndoToast } from "@/lib/store/toast-store";
import { rollingAverage } from "@/lib/utils";
import type { BodyMetricEntry } from "@/lib/db/types";

export default function VucutPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const now = new Date();
  const entries = useLiveQuery(() => getBodyMetricsInRange(subDays(now, 89), now), []);

  const withWeight = (entries ?? []).filter((e) => e.weightKg != null);
  const avgSeries = rollingAverage(withWeight.map((e) => e.weightKg ?? null));
  const chartData = withWeight.map((e, i) => ({
    label: format(new Date(e.date), "d MMM", { locale: tr }),
    weight: e.weightKg,
    avg: avgSeries[i],
  }));

  const withPhoto = (entries ?? []).filter((e) => e.photoId);
  const latestPhoto = withPhoto[withPhoto.length - 1];
  const earliestPhoto = withPhoto[0];

  const latest = entries?.[entries.length - 1];

  return (
    <>
      <PageHeader eyebrow="Beden" title="Vücut" />
      <div className="px-5 mt-2 space-y-4 pb-4">
        <Card className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-hareket)]/12 shrink-0">
            <Scale className="h-5 w-5 text-[var(--color-hareket)]" />
          </span>
          <div>
            <p className="text-[17px] font-bold tabular-nums-tight text-[var(--color-text-primary)]">
              {latest?.weightKg ? `${latest.weightKg} kg` : "—"}
            </p>
            <p className="text-[12px] text-[var(--color-text-secondary)]">
              {latest ? format(new Date(latest.date), "d MMMM", { locale: tr }) : "Henüz kayıt yok"}
            </p>
          </div>
        </Card>

        {chartData.length > 1 && (
          <Card>
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2">Kilo trendi (7 günlük ortalama)</p>
            <div className="h-[140px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <XAxis dataKey="label" tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
                  <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-card-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v) => [`${v} kg`, ""]}
                  />
                  <Line type="monotone" dataKey="weight" stroke="var(--color-text-tertiary)" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="avg" stroke="var(--color-hareket)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {withPhoto.length > 0 && (
          <Card>
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">İlerleme fotoğrafları</p>
            <div className="flex gap-3">
              <PhotoCompareTile entry={earliestPhoto} label="İlk" />
              {latestPhoto !== earliestPhoto && <PhotoCompareTile entry={latestPhoto} label="Son" />}
            </div>
          </Card>
        )}

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
                      {[e.weightKg && `${e.weightKg} kg`, e.waistCm && `bel ${e.waistCm} cm`, e.bodyFatPct && `yağ %${e.bodyFatPct}`].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await softDeleteBodyMetric(e.id);
                      showUndoToast("Kayıt silindi", () => restoreBodyMetric(e.id));
                    }}
                    className="p-2 -m-2 text-[var(--color-text-tertiary)]"
                    aria-label="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
          ) : (
            <EmptyState icon={<Scale className="h-6 w-6" />} title="Henüz vücut ölçümü yok" />
          )}
        </Card>

        <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Ölçüm Ekle
        </Button>
      </div>

      <AddBodySheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}

function PhotoCompareTile({ entry, label }: { entry: BodyMetricEntry; label: string }) {
  const url = useBlobUrl(() => (entry.photoId ? getBodyPhotoBlob(entry.photoId) : Promise.resolve(undefined)), [entry.photoId]);
  return (
    <div className="flex-1">
      <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-[var(--color-card-raised)]">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <p className="text-[11px] text-[var(--color-text-tertiary)] text-center mt-1">
        {label} · {format(new Date(entry.date), "d MMM", { locale: tr })}
      </p>
    </div>
  );
}
