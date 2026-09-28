"use client";

import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/stat";
import { useLevel } from "@/lib/hooks/use-level";

export function LevelCard() {
  const level = useLevel();
  if (!level) return null;

  return (
    <Card className="flex items-center gap-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-warning)]/15 shrink-0">
        <Star className="h-5 w-5 text-[var(--color-warning)]" fill="var(--color-warning)" />
      </span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[14px] font-bold text-[var(--color-text-primary)]">Seviye {level.level}</p>
          <p className="text-[11px] text-[var(--color-text-tertiary)]">
            {level.xpIntoLevel} / {level.xpNeededForNextLevel} XP
          </p>
        </div>
        <ProgressBar value={level.progressPercent} colorVar="--color-warning" />
      </div>
    </Card>
  );
}
