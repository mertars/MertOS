"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Award, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BADGE_DEFINITIONS } from "@/lib/badges/definitions";
import { getEarnedBadgeIds } from "@/lib/badges/engine";

export function BadgesGrid() {
  const earned = useLiveQuery(() => getEarnedBadgeIds(), []);
  if (!earned) return null;

  return (
    <Card>
      <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">
        Rozetler ({earned.size}/{BADGE_DEFINITIONS.length})
      </p>
      <div className="grid grid-cols-4 gap-3">
        {BADGE_DEFINITIONS.map((b) => {
          const isEarned = earned.has(b.id);
          return (
            <div key={b.id} className="flex flex-col items-center gap-1.5 text-center" title={b.description}>
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{
                  backgroundColor: isEarned ? `color-mix(in srgb, var(${b.accentVar}) 20%, transparent)` : "rgba(255,255,255,0.04)",
                }}
              >
                {isEarned ? <Award className="h-5 w-5" style={{ color: `var(${b.accentVar})` }} /> : <Lock className="h-4 w-4 text-[var(--color-text-tertiary)]" />}
              </span>
              <span className={`text-[9.5px] leading-tight ${isEarned ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"}`}>{b.label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
