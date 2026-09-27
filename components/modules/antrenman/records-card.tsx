"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAllPersonalRecords } from "@/lib/programs/records";

function formatValue(value: number, unit: string) {
  if (unit === "sn") {
    const m = Math.floor(value / 60);
    const s = Math.round(value % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  if (unit === "m") return `${(value / 1000).toFixed(2)} km`;
  return `${value} ${unit}`;
}

export function RecordsCard() {
  const records = useLiveQuery(() => getAllPersonalRecords(), []);

  return (
    <Card>
      <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2">Kişisel Rekorlar</p>
      {records && records.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
          {records
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((r) => (
              <div key={r.id} className="rounded-2xl bg-[var(--color-card-raised)] p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Trophy className="h-3.5 w-3.5 text-[var(--color-warning)]" />
                  <span className="text-[11px] text-[var(--color-text-secondary)] truncate">{r.label}</span>
                </div>
                <p className="text-[16px] font-bold tabular-nums-tight text-[var(--color-text-primary)]">
                  {formatValue(r.value, r.unit)}
                </p>
                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{format(new Date(r.date), "d MMM")}</p>
              </div>
            ))}
        </div>
      ) : (
        <EmptyState icon={<Trophy className="h-6 w-6" />} title="Henüz rekor yok" description="Antrenman kaydettikçe burada birikecek." />
      )}
    </Card>
  );
}
