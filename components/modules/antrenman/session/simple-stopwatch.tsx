"use client";

import { useEffect, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = h > 0 ? m.toString().padStart(2, "0") : m.toString();
  return h > 0 ? `${h}:${mm}:${s.toString().padStart(2, "0")}` : `${mm}:${s.toString().padStart(2, "0")}`;
}

export function SimpleStopwatch({ label, onFinish }: { label: string; onFinish: (seconds: number) => void }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  return (
    <Card className="flex flex-col items-center gap-6 py-8">
      <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">{label}</p>
      <span className="text-6xl font-bold tabular-nums-tight text-[var(--color-text-primary)]">{formatTime(seconds)}</span>
      <div className="flex items-center gap-3">
        <Button size="icon" variant="secondary" onClick={() => setRunning((r) => !r)} aria-label={running ? "Duraklat" : "Devam"}>
          {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button variant="accent" accentVar="--color-hareket" onClick={() => onFinish(seconds)}>
          <Square className="h-4 w-4" fill="currentColor" />
          Bitir
        </Button>
      </div>
    </Card>
  );
}
