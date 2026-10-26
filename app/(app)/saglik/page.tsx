"use client";

import Link from "next/link";
import { Activity, Apple, BarChart3, Brain, Cigarette, Droplets, Dumbbell, HeartPulse, Moon, Scale, Upload, Utensils } from "lucide-react";
import { SectionTitle } from "@/components/fx/bits";
import { CardLabel, GlassCard } from "@/components/fx/glass-card";
import { HistoryCard, TodaySportTiles, useHealthHistory, WeekCard } from "@/components/fx/health-cards";
import { Dashboard } from "@/components/home/dashboard";
import { useBrief, visibleBrief } from "@/lib/assistant/use-brief";
import { cn } from "@/lib/utils";

// Sağlık sekmesi (Faz 3): asistanın günlük motorundan haftalık tutarlılık ve son
// 7 gün; altında eski sağlık modülleri (IndexedDB — veri ve mantık korunuyor) ve
// eski MertOS paneli (skor halkaları, su, sigara…).

const MODULES = [
  { href: "/hublar/beden/antrenman", label: "Antrenman", note: "8 haftalık program", icon: Dumbbell, wide: true },
  { href: "/hublar/beden/kalp", label: "Kalp", note: "nabız, VO2max", icon: HeartPulse },
  { href: "/hublar/beden/uyku", label: "Uyku", note: "süre, borç", icon: Moon },
  { href: "/hublar/beden/vucut", label: "Vücut", note: "kilo, ölçü", icon: Scale },
  { href: "/hublar/beden/aktivite", label: "Aktivite", note: "adım", icon: Activity },
  { href: "/hublar/beslenme/su", label: "Su", note: "günlük hedef", icon: Droplets },
  { href: "/hublar/beslenme/ogunler", label: "Öğünler", note: "makrolar", icon: Utensils },
  { href: "/hublar/sigara/takip", label: "Sigara", note: "sayaç", icon: Cigarette },
  { href: "/hublar/beslenme/takviyeler", label: "Takviyeler", note: "günlük", icon: Apple },
  { href: "/hublar/zihin", label: "Zihin", note: "ruh hali, günlük", icon: Brain, wide: true },
  { href: "/import", label: "Apple Sağlık", note: "içe aktar", icon: Upload },
  { href: "/istatistik", label: "İstatistik", note: "korelasyonlar", icon: BarChart3 },
];

export default function SaglikPage() {
  const { state } = useBrief();
  const { brief } = visibleBrief(state);
  const history = useHealthHistory(14);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-10 lg:px-7">
      <SectionTitle eyebrow="Sağlık · bu hafta" title="Sağlık" />
      <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        <div className="space-y-3 lg:space-y-4">
          {brief && <WeekCard brief={brief} />}
          {brief && <TodaySportTiles brief={brief} />}
        </div>
        <HistoryCard history={history} index={3} />
      </div>

      <h2 className="fx-num mb-3 mt-7 text-[10.5px] tracking-[0.14em] text-[var(--fx-text-3)]">ÖLÇÜMLER VE MODÜLLER</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MODULES.map((m, i) => {
          const Icon = m.icon;
          return (
            <Link key={m.href} href={m.href} className={cn(m.wide && "col-span-2")}>
              <GlassCard accent="--fx-saglik" index={i + 4} className="h-full">
                <Icon className="h-5 w-5 text-[var(--fx-saglik)]" />
                <CardLabel className="mt-3">{m.label}</CardLabel>
                <p className="text-[12px] text-[var(--fx-text-3)]">{m.note}</p>
              </GlassCard>
            </Link>
          );
        })}
      </div>

      <h2 className="fx-num mb-1 mt-8 text-[10.5px] tracking-[0.14em] text-[var(--fx-text-3)]">MERTOS PANELİ</h2>
      <div className="-mx-5 lg:mx-0">
        <Dashboard />
      </div>
    </main>
  );
}
