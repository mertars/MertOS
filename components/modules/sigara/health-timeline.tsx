"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/stat";
import { clamp } from "@/lib/utils";

interface Milestone {
  minutes: number;
  label: string;
  description: string;
}

const MILESTONES: Milestone[] = [
  { minutes: 20, label: "20 dakika", description: "Nabız normale dönmeye başlar." },
  { minutes: 12 * 60, label: "12 saat", description: "Kandaki karbonmonoksit seviyesi normale iner." },
  { minutes: 14 * 24 * 60, label: "2 hafta", description: "Dolaşım ve akciğer fonksiyonu iyileşmeye başlar." },
  { minutes: 84 * 24 * 60, label: "12 hafta", description: "Dolaşım ve akciğer fonksiyonu belirgin iyileşir." },
  { minutes: 270 * 24 * 60, label: "9 ay", description: "Öksürük ve nefes darlığı azalır." },
  { minutes: 365 * 24 * 60, label: "1 yıl", description: "Kalp hastalığı riski belirgin düşer." },
];

export function HealthTimeline({ since }: { since: Date | null }) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const elapsedMin = since ? (now - since.getTime()) / 60000 : 0;

  return (
    <Card>
      <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-0.5">Sağlık kazanımları</p>
      <p className="text-[11.5px] text-[var(--color-text-tertiary)] mb-4">
        {since ? "Son sigaradan itibaren" : "Temiz kaldıkça burada ilerleme göreceksin"} · genel bilgi amaçlıdır, tıbbi tavsiye değildir
      </p>
      <div className="space-y-4">
        {MILESTONES.map((m) => {
          const pct = since ? clamp((elapsedMin / m.minutes) * 100, 0, 100) : 0;
          const done = pct >= 100;
          return (
            <div key={m.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[13px] font-medium ${done ? "text-[var(--color-sigara-temiz)]" : "text-[var(--color-text-primary)]"}`}>
                  {m.label}
                </span>
                <span className="text-[11px] text-[var(--color-text-tertiary)]">{Math.round(pct)}%</span>
              </div>
              <ProgressBar value={pct} colorVar={done ? "--color-sigara-temiz" : "--color-sigara"} />
              <p className="text-[11.5px] text-[var(--color-text-secondary)] mt-1">{m.description}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
