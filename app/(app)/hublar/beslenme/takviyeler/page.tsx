"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Pill, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { addSupplement, deactivateSupplement, getActiveSupplements, getLogsForDate, setSupplementTaken } from "@/lib/db/repo/supplements";

export default function TakviyelerPage() {
  const supplements = useLiveQuery(() => getActiveSupplements(), []);
  const logs = useLiveQuery(() => getLogsForDate(), []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");

  async function handleAdd() {
    if (!name.trim()) return;
    await addSupplement({ name: name.trim(), dosage: dosage || undefined, timeOfDay: timeOfDay || undefined });
    setName("");
    setDosage("");
    setTimeOfDay("");
    setSheetOpen(false);
  }

  const takenCount = supplements ? supplements.filter((s) => logs?.[s.id]).length : 0;

  return (
    <>
      <PageHeader eyebrow="Beslenme" title="Takviyeler" />
      <div className="px-5 mt-2 space-y-4 pb-4">
        {supplements && supplements.length > 0 && (
          <Card className="flex items-center justify-between">
            <p className="text-[13px] text-[var(--color-text-secondary)]">Bugün</p>
            <p className="text-[15px] font-bold tabular-nums-tight text-[var(--color-beslenme)]">
              {takenCount} / {supplements.length}
            </p>
          </Card>
        )}

        {supplements && supplements.length > 0 ? (
          <Card>
            {supplements.map((s) => {
              const taken = logs?.[s.id] ?? false;
              return (
                <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--color-border)] last:border-0">
                  <button
                    onClick={() => setSupplementTaken(s.id, new Date(), !taken)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border shrink-0 transition-colors ${
                      taken ? "bg-[var(--color-beslenme)] border-[var(--color-beslenme)]" : "border-[var(--color-border-strong)]"
                    }`}
                    aria-label={taken ? "Alındı, kaldır" : "Alındı olarak işaretle"}
                  >
                    {taken && <Check className="h-4 w-4 text-black" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-[var(--color-text-primary)]">{s.name}</p>
                    {(s.dosage || s.timeOfDay) && (
                      <p className="text-[11.5px] text-[var(--color-text-tertiary)]">
                        {[s.dosage, s.timeOfDay].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <button onClick={() => deactivateSupplement(s.id)} className="p-2 -m-2 text-[var(--color-text-tertiary)]" aria-label="Kaldır">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </Card>
        ) : (
          <Card>
            <EmptyState icon={<Pill className="h-6 w-6" />} title="Henüz takviye eklenmedi" description="Düzenli aldığın takviyeleri ekleyip günlük takip et." />
          </Card>
        )}

        <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Takviye Ekle
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Takviye Ekle">
        <div className="space-y-3">
          <div>
            <Label>Ad</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. D Vitamini" />
          </div>
          <div>
            <Label>Doz (opsiyonel)</Label>
            <Input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="Örn. 2000 IU" />
          </div>
          <div>
            <Label>Zaman (opsiyonel)</Label>
            <Input value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} placeholder="Örn. Sabah" />
          </div>
          <Button variant="accent" accentVar="--color-beslenme" className="w-full" onClick={handleAdd}>
            Ekle
          </Button>
        </div>
      </Sheet>
    </>
  );
}
