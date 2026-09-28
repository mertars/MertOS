"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { addFocusSession, getFocusSessionsForToday } from "@/lib/db/repo/uretkenlik";
import { playFinishChime } from "@/lib/audio/beep";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";

const PRESETS = [15, 25, 50];

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function OdakPage() {
  const [targetMin, setTargetMin] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const startedAtRef = useRef<string | null>(null);
  const sessions = useLiveQuery(() => getFocusSessionsForToday(), []);

  useWakeLock(running);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        finish(true, targetMin * 60);
        return 0;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function start() {
    startedAtRef.current = new Date().toISOString();
    setRunning(true);
  }

  function pause() {
    setRunning(false);
  }

  async function finish(completed: boolean, actualDurationSec?: number) {
    setRunning(false);
    if (startedAtRef.current) {
      const actual = actualDurationSec ?? targetMin * 60 - remaining;
      await addFocusSession({
        startedAt: startedAtRef.current,
        targetDurationSec: targetMin * 60,
        actualDurationSec: actual,
        completed,
      });
      if (completed) playFinishChime();
    }
    startedAtRef.current = null;
    setRemaining(targetMin * 60);
  }

  function selectPreset(min: number) {
    if (running) return;
    setTargetMin(min);
    setRemaining(min * 60);
  }

  const totalFocusedMin = Math.round((sessions ?? []).reduce((s, f) => s + f.actualDurationSec, 0) / 60);

  return (
    <>
      <PageHeader eyebrow="Üretkenlik" title="Odak" />
      <div className="px-5 mt-2 space-y-4 pb-4">
        <Card className="flex flex-col items-center gap-5 py-7">
          {!running && (
            <div className="flex gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => selectPreset(p)}
                  className={`rounded-full px-4 py-2 text-[13px] font-medium min-h-9 ${
                    targetMin === p ? "bg-[var(--color-uretkenlik)] text-white" : "bg-[var(--color-card-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                  }`}
                >
                  {p} dk
                </button>
              ))}
            </div>
          )}

          <div className="flex h-48 w-48 items-center justify-center rounded-full border-4 border-[var(--color-uretkenlik)]">
            <span className="text-5xl font-bold tabular-nums-tight text-[var(--color-text-primary)]">{formatTime(remaining)}</span>
          </div>

          <div className="flex items-center gap-3">
            {!running && remaining !== targetMin * 60 && (
              <Button size="icon" variant="secondary" onClick={() => finish(false)} aria-label="Sıfırla">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <Button variant="accent" accentVar="--color-uretkenlik" onClick={running ? pause : start}>
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" fill="currentColor" />}
              {running ? "Duraklat" : "Başlat"}
            </Button>
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <p className="text-[13px] text-[var(--color-text-secondary)]">Bugün odaklanılan süre</p>
          <p className="text-[15px] font-bold tabular-nums-tight text-[var(--color-uretkenlik)]">{totalFocusedMin} dk</p>
        </Card>

        {sessions && sessions.length > 0 ? (
          <Card>
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-1">Bugünkü oturumlar</p>
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                <span className="text-[13px] text-[var(--color-text-primary)]">{Math.round(s.actualDurationSec / 60)} dk</span>
                <span className="text-[11.5px] text-[var(--color-text-tertiary)]">{s.completed ? "Tamamlandı" : "Yarım kaldı"}</span>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState icon={<Timer className="h-6 w-6" />} title="Bugün henüz odak oturumu yok" />
        )}
      </div>
    </>
  );
}
