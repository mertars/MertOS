"use client";

import { useRouter } from "next/navigation";
import { Trophy, PartyPopper } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatNumber } from "@/components/ui/stat";
import type { PersonalRecord } from "@/lib/db/types";

export function SessionSummary({
  durationSec,
  volumeLabel,
  records,
}: {
  durationSec: number;
  volumeLabel?: string;
  records: PersonalRecord[];
}) {
  const router = useRouter();
  const min = Math.round(durationSec / 60);

  return (
    <Card className="flex flex-col items-center gap-5 py-8 text-center">
      <PartyPopper className="h-8 w-8 text-[var(--color-hareket)]" />
      <div>
        <p className="text-[17px] font-bold text-[var(--color-text-primary)]">Oturum tamamlandı</p>
        <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">Harika iş çıkardın.</p>
      </div>

      <div className="flex gap-6">
        <div className="text-center">
          <StatNumber value={min} unit="dk" size="lg" />
          <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">Süre</p>
        </div>
        {volumeLabel && (
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums-tight text-[var(--color-text-primary)]">{volumeLabel}</p>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">Hacim</p>
          </div>
        )}
      </div>

      {records.length > 0 && (
        <div className="w-full space-y-2">
          {records.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-2xl bg-[var(--color-warning)]/10 px-3 py-2.5">
              <Trophy className="h-4 w-4 text-[var(--color-warning)] shrink-0" />
              <span className="text-[13px] font-medium text-[var(--color-text-primary)]">Yeni rekor: {r.label}</span>
            </div>
          ))}
        </div>
      )}

      <Button variant="accent" accentVar="--color-hareket" className="w-full" onClick={() => router.push("/hublar/beden/antrenman")}>
        Bitti
      </Button>
    </Card>
  );
}
