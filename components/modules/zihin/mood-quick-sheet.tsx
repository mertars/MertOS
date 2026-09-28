"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { addMoodEntry, softDeleteMoodEntry } from "@/lib/db/repo/zihin";
import { showUndoToast } from "@/lib/store/toast-store";

const MOOD_EMOJI = ["😞", "😕", "😐", "🙂", "😄"];
const ENERGY_EMOJI = ["🪫", "🔋", "⚡️", "⚡️⚡️", "🚀"];
const STRESS_EMOJI = ["😌", "🙂", "😐", "😬", "🥵"];

function ChipRow({ emojis, value, onChange }: { emojis: string[]; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-2">
      {emojis.map((e, i) => {
        const v = i + 1;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`flex-1 rounded-xl py-2.5 text-xl min-h-11 transition-transform ${
              value === v ? "bg-[var(--color-zihin)]/20 border border-[var(--color-zihin)] scale-105" : "bg-[var(--color-card-raised)] border border-[var(--color-border)]"
            }`}
          >
            {e}
          </button>
        );
      })}
    </div>
  );
}

export function MoodQuickSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);

  async function handleSave() {
    const id = await addMoodEntry({ mood, energy, stress });
    onOpenChange(false);
    setMood(3);
    setEnergy(3);
    setStress(3);
    showUndoToast("Ruh hali kaydedildi", () => softDeleteMoodEntry(id));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Şu an nasılsın?" description="3 saniyede bitir.">
      <div className="space-y-4">
        <div>
          <Label>Ruh hali</Label>
          <ChipRow emojis={MOOD_EMOJI} value={mood} onChange={setMood} />
        </div>
        <div>
          <Label>Enerji</Label>
          <ChipRow emojis={ENERGY_EMOJI} value={energy} onChange={setEnergy} />
        </div>
        <div>
          <Label>Stres</Label>
          <ChipRow emojis={STRESS_EMOJI} value={stress} onChange={setStress} />
        </div>
        <Button variant="accent" accentVar="--color-zihin" className="w-full" onClick={handleSave}>
          Kaydet
        </Button>
      </div>
    </Sheet>
  );
}
