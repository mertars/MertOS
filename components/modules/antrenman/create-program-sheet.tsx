"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createCustomProgram, setActiveProgram } from "@/lib/db/repo/programs";
import { KIND_LABEL } from "@/lib/programs/labels";
import { uid } from "@/lib/utils";
import type { ProgramDay, WorkoutType } from "@/lib/db/types";

const TYPES: WorkoutType[] = ["kosu", "interval", "kuvvet", "halisaha", "yuruyus", "ip_atlama", "serbest"];

interface DraftDay {
  key: string;
  label: string;
  kind: WorkoutType;
  description: string;
  durationMin: string;
}

function emptyDay(): DraftDay {
  return { key: uid(), label: "", kind: "kosu", description: "", durationMin: "30" };
}

export function CreateProgramSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<DraftDay[]>([emptyDay()]);

  async function handleSave() {
    if (!name.trim() || days.every((d) => !d.label.trim())) return;
    const validDays: Omit<ProgramDay, "id">[] = days
      .filter((d) => d.label.trim())
      .map((d) => ({
        label: d.label,
        kind: d.kind,
        description: d.description || `${KIND_LABEL[d.kind]} antrenmanı`,
        durationMin: Number(d.durationMin) || 30,
      }));
    const id = await createCustomProgram(name, description, validDays);
    await setActiveProgram(id);
    onOpenChange(false);
    setName("");
    setDescription("");
    setDays([emptyDay()]);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Kendi Programını Oluştur" description="Basit, tekrarlayan haftalık bir program.">
      <div className="space-y-4">
        <div>
          <Label>Program adı</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Hafif Hafta" />
        </div>
        <div>
          <Label>Açıklama</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="opsiyonel" />
        </div>

        <div>
          <Label>Günler</Label>
          <div className="space-y-3">
            {days.map((d) => (
              <div key={d.key} className="rounded-2xl border border-[var(--color-border)] p-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Gün adı (Örn. Kolay Koşu)"
                    value={d.label}
                    onChange={(e) => setDays((ds) => ds.map((x) => (x.key === d.key ? { ...x, label: e.target.value } : x)))}
                    className="flex-1 text-[13px]"
                  />
                  <button onClick={() => setDays((ds) => ds.filter((x) => x.key !== d.key))} className="p-2 text-[var(--color-text-tertiary)]" aria-label="Günü sil">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setDays((ds) => ds.map((x) => (x.key === d.key ? { ...x, kind: t } : x)))}
                      className={`rounded-full px-2.5 py-1.5 text-[11px] font-medium ${
                        d.kind === t ? "bg-[var(--color-hareket)] text-black" : "bg-[var(--color-card-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                      }`}
                    >
                      {KIND_LABEL[t]}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Süre (dk)"
                  inputMode="numeric"
                  value={d.durationMin}
                  onChange={(e) => setDays((ds) => ds.map((x) => (x.key === d.key ? { ...x, durationMin: e.target.value } : x)))}
                  className="text-[13px]"
                />
              </div>
            ))}
          </div>
          <button onClick={() => setDays((ds) => [...ds, emptyDay()])} className="flex items-center gap-1 text-[12.5px] font-medium text-[var(--color-hareket)] mt-2 py-1">
            <Plus className="h-3.5 w-3.5" /> Gün ekle
          </button>
        </div>

        <Button variant="accent" accentVar="--color-hareket" onClick={handleSave} className="w-full">
          Oluştur ve Etkinleştir
        </Button>
      </div>
    </Sheet>
  );
}
