"use client";

import { useEffect, useState } from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Segment } from "@/lib/session/segments";
import { playFinishChime, playTransitionBeep, vibrate } from "@/lib/audio/beep";
import { cn } from "@/lib/utils";

const KIND_COLOR: Record<Segment["kind"], string> = {
  isinma: "--color-su",
  calisma: "--color-hareket",
  dinlenme: "--color-text-tertiary",
};

const KIND_TITLE: Record<Segment["kind"], string> = {
  isinma: "Isınma",
  calisma: "ÇALIŞMA",
  dinlenme: "Dinlenme",
};

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SegmentTimer({ segments, onComplete }: { segments: Segment[]; onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(segments[0]?.seconds ?? 0);
  const [running, setRunning] = useState(true);

  const current = segments[index];
  const next = segments[index + 1];

  useEffect(() => {
    if (!running || !current) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        if (index + 1 < segments.length) {
          playTransitionBeep();
          vibrate(150);
          setIndex((i) => i + 1);
          return segments[index + 1].seconds;
        }
        playFinishChime();
        vibrate([100, 60, 100]);
        setRunning(false);
        onComplete();
        return 0;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, current, index, segments, onComplete]);

  if (!current) return null;

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="text-center">
        <p
          className="text-[13px] font-bold tracking-wide"
          style={{ color: `var(${KIND_COLOR[current.kind]})` }}
        >
          {KIND_TITLE[current.kind]}
        </p>
        <p className="text-[15px] text-[var(--color-text-secondary)] mt-0.5">{current.label}</p>
      </div>

      <div
        className={cn(
          "flex h-52 w-52 items-center justify-center rounded-full border-4 tabular-nums-tight",
          current.kind === "calisma" ? "border-[var(--color-hareket)]" : "border-[var(--color-border-strong)]",
        )}
      >
        <span className="text-6xl font-bold text-[var(--color-text-primary)]">{formatTime(Math.max(0, remaining))}</span>
      </div>

      {next && <p className="text-[12.5px] text-[var(--color-text-tertiary)]">Sıradaki: {next.label}</p>}

      <div className="flex items-center gap-3">
        <Button size="icon" variant="secondary" onClick={() => setRunning((r) => !r)} aria-label={running ? "Duraklat" : "Devam"}>
          {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button
          size="icon"
          variant="secondary"
          aria-label="Atla"
          onClick={() => {
            if (index + 1 < segments.length) {
              setIndex((i) => i + 1);
              setRemaining(segments[index + 1].seconds);
            } else {
              onComplete();
            }
          }}
        >
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
