"use client";

import { useState } from "react";
import { Reorder } from "framer-motion";
import { GripVertical, Eye, EyeOff, Pencil, Check } from "lucide-react";
import { ScoreCard } from "./score-card";
import { NextUpCard } from "./next-up-card";
import { QuickStrip } from "./quick-strip";
import { CigaretteLiveCard } from "./cigarette-live-card";
import { HubMiniGrid } from "./hub-mini-grid";
import { useSettings } from "@/lib/hooks/db-hooks";
import { useBadgeEvaluation } from "@/lib/hooks/use-badge-evaluation";
import { db, SINGLETON_IDS } from "@/lib/db";
import { cn } from "@/lib/utils";

const CARD_REGISTRY: Record<string, { label: string; render: () => React.ReactNode }> = {
  skor: { label: "MertOS Skoru", render: () => <ScoreCard /> },
  siradaki: { label: "Sıradaki Antrenman", render: () => <NextUpCard /> },
  "hizli-seritler": { label: "Hızlı Sayaçlar", render: () => <QuickStrip /> },
  sigara: { label: "Sigara Sayacı", render: () => <CigaretteLiveCard /> },
  "hub-grid": { label: "Hub Özetleri", render: () => <HubMiniGrid /> },
};

export function Dashboard() {
  const settings = useSettings();
  const [editing, setEditing] = useState(false);
  useBadgeEvaluation();

  if (!settings) return null;

  const order = settings.dashboardCardOrder.filter((id) => id in CARD_REGISTRY);
  const hidden = new Set(settings.dashboardCardHidden);
  const visibleOrder = order.filter((id) => !hidden.has(id));

  async function persistOrder(next: string[]) {
    await db.settings.update(SINGLETON_IDS.SETTINGS_ID, { dashboardCardOrder: next });
  }

  async function toggleHidden(id: string) {
    const next = hidden.has(id) ? [...hidden].filter((h) => h !== id) : [...hidden, id];
    await db.settings.update(SINGLETON_IDS.SETTINGS_ID, { dashboardCardHidden: next });
  }

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end px-5">
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-text-tertiary)] py-1 px-1 min-h-11"
          >
            <Pencil className="h-3.5 w-3.5" />
            Düzenle
          </button>
        </div>
        {visibleOrder.map((id) => (
          <div key={id}>{CARD_REGISTRY[id].render()}</div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end px-5">
        <button
          onClick={() => setEditing(false)}
          className="flex items-center gap-1 text-[12px] font-semibold text-[var(--color-hareket)] py-1 px-1 min-h-11"
        >
          <Check className="h-3.5 w-3.5" />
          Bitti
        </button>
      </div>
      <Reorder.Group
        axis="y"
        values={order}
        onReorder={persistOrder}
        className="space-y-2.5 px-5"
      >
        {order.map((id) => (
          <Reorder.Item
            key={id}
            value={id}
            className={cn(
              "flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3",
              hidden.has(id) && "opacity-40",
            )}
          >
            <GripVertical className="h-4 w-4 text-[var(--color-text-tertiary)] shrink-0 cursor-grab active:cursor-grabbing" />
            <span className="flex-1 text-[14px] font-medium text-[var(--color-text-primary)]">
              {CARD_REGISTRY[id].label}
            </span>
            <button onClick={() => toggleHidden(id)} className="p-2 -m-2 text-[var(--color-text-secondary)]">
              {hidden.has(id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}
