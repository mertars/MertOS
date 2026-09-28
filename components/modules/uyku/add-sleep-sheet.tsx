"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { addSleepEntry, softDeleteSleepEntry } from "@/lib/db/repo/health";
import { showUndoToast } from "@/lib/store/toast-store";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AddSleepSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const now = new Date();
  const defaultWake = toLocalInputValue(now);
  const defaultBed = toLocalInputValue(new Date(now.getTime() - 8 * 3600_000));

  const [bedTime, setBedTime] = useState(defaultBed);
  const [wakeTime, setWakeTime] = useState(defaultWake);
  const [quality, setQuality] = useState(3);

  async function handleSave() {
    const bed = new Date(bedTime);
    const wake = new Date(wakeTime);
    if (wake <= bed) return;
    const durationMin = Math.round((wake.getTime() - bed.getTime()) / 60000);
    const id = await addSleepEntry({
      date: wake.toISOString().slice(0, 10),
      bedTime: bed.toISOString(),
      wakeTime: wake.toISOString(),
      durationMin,
      quality: quality as 1 | 2 | 3 | 4 | 5,
      source: "manuel",
    });
    onOpenChange(false);
    showUndoToast("Uyku kaydedildi", () => softDeleteSleepEntry(id));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Uyku Ekle">
      <div className="space-y-4">
        <div>
          <Label>Yatış</Label>
          <Input type="datetime-local" value={bedTime} onChange={(e) => setBedTime(e.target.value)} />
        </div>
        <div>
          <Label>Kalkış</Label>
          <Input type="datetime-local" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
        </div>
        <div>
          <Label>Kalite</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold min-h-11 ${
                  quality === q ? "bg-[var(--color-uyku)] text-white" : "bg-[var(--color-card-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
        <Button variant="accent" accentVar="--color-uyku" className="w-full" onClick={handleSave}>
          Kaydet
        </Button>
      </div>
    </Sheet>
  );
}
