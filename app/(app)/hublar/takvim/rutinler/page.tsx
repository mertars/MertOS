"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, SunMoon, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { useToastStore } from "@/lib/store/toast-store";
import { addRoutineTemplate, applyRoutineTemplate, deleteRoutineTemplate, getRoutineTemplates } from "@/lib/db/repo/takvim";
import { uid } from "@/lib/utils";
import type { RoutineBlockTemplate, RoutineType } from "@/lib/db/types";

const TYPE_OPTIONS: { value: RoutineType; label: string }[] = [
  { value: "sabah", label: "Sabah" },
  { value: "aksam", label: "Akşam" },
  { value: "haftaici", label: "Hafta İçi" },
  { value: "haftasonu", label: "Hafta Sonu" },
  { value: "antrenman-gunu", label: "Antrenman Günü" },
];

interface DraftBlock extends RoutineBlockTemplate {
  key: string;
}

export default function RutinlerPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<RoutineType>("sabah");
  const [blocks, setBlocks] = useState<DraftBlock[]>([{ key: uid(), label: "", time: "06:00", durationMin: 30 }]);

  const templates = useLiveQuery(() => getRoutineTemplates(), []);
  const pushToast = useToastStore((s) => s.push);

  async function handleSave() {
    const valid = blocks.filter((b) => b.label.trim());
    if (!name.trim() || valid.length === 0) return;
    await addRoutineTemplate(name.trim(), type, valid.map(({ label, time, durationMin }) => ({ label, time, durationMin })));
    setName("");
    setBlocks([{ key: uid(), label: "", time: "06:00", durationMin: 30 }]);
    setSheetOpen(false);
  }

  return (
    <>
      <PageHeader eyebrow="Takvim & Rutin" title="Rutinler" />
      <div className="px-5 mt-2 space-y-3 pb-4">
        {templates && templates.length > 0 ? (
          templates.map((t) => (
            <Card key={t.id}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">{t.name}</p>
                  <p className="text-[11.5px] text-[var(--color-text-tertiary)]">{TYPE_OPTIONS.find((o) => o.value === t.type)?.label}</p>
                </div>
                <button onClick={() => deleteRoutineTemplate(t.id)} className="p-1.5 text-[var(--color-text-tertiary)]" aria-label="Sil">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1 mb-3">
                {t.blocks.map((b, i) => (
                  <p key={i} className="text-[12px] text-[var(--color-text-secondary)]">
                    {b.time} — {b.label} ({b.durationMin} dk)
                  </p>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={async () => {
                  await applyRoutineTemplate(t.id);
                  pushToast({ title: "Bugüne uygulandı", variant: "success" });
                }}
              >
                Bugüne Uygula
              </Button>
            </Card>
          ))
        ) : (
          <EmptyState icon={<SunMoon className="h-6 w-6" />} title="Henüz rutin şablonu yok" />
        )}

        <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Rutin Oluştur
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Rutin Oluştur">
        <div className="space-y-4">
          <div>
            <Label>Ad</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Sabah Rutinim" />
          </div>
          <div>
            <Label>Tür</Label>
            <Segmented options={TYPE_OPTIONS} value={type} onChange={setType} />
          </div>
          <div>
            <Label>Bloklar</Label>
            <div className="space-y-2">
              {blocks.map((b) => (
                <div key={b.key} className="flex gap-1.5">
                  <Input type="time" value={b.time} onChange={(e) => setBlocks((bs) => bs.map((x) => (x.key === b.key ? { ...x, time: e.target.value } : x)))} className="w-24 px-2 text-[12px]" />
                  <Input placeholder="Ne yapılacak" value={b.label} onChange={(e) => setBlocks((bs) => bs.map((x) => (x.key === b.key ? { ...x, label: e.target.value } : x)))} className="flex-1 text-[13px]" />
                  <Input
                    type="number"
                    value={b.durationMin}
                    onChange={(e) => setBlocks((bs) => bs.map((x) => (x.key === b.key ? { ...x, durationMin: Number(e.target.value) || 0 } : x)))}
                    className="w-16 px-2 text-[12px]"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => setBlocks((bs) => [...bs, { key: uid(), label: "", time: "06:00", durationMin: 30 }])}
              className="text-[12.5px] font-medium text-[var(--color-su)] mt-2"
            >
              + Blok ekle
            </button>
          </div>
          <Button variant="accent" accentVar="--color-su" className="w-full" onClick={handleSave}>
            Oluştur
          </Button>
        </div>
      </Sheet>
    </>
  );
}
