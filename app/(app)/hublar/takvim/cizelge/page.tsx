"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CalendarDays, Check, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import {
  addImportantDate,
  addScheduleBlock,
  applyRoutineTemplate,
  daysUntilNextOccurrence,
  deleteImportantDate,
  deleteScheduleBlock,
  getAllImportantDates,
  getRoutineTemplates,
  getScheduleBlocksForDate,
  toggleScheduleBlockCompleted,
} from "@/lib/db/repo/takvim";

export default function CizelgePage() {
  const [blockSheetOpen, setBlockSheetOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("08:00");
  const [label, setLabel] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [repeatsYearly, setRepeatsYearly] = useState(true);

  const blocks = useLiveQuery(() => getScheduleBlocksForDate(), []);
  const templates = useLiveQuery(() => getRoutineTemplates(), []);
  const importantDates = useLiveQuery(() => getAllImportantDates(), []);

  async function handleAddBlock() {
    if (!label.trim()) return;
    await addScheduleBlock({ startTime, endTime, label: label.trim() });
    setLabel("");
    setBlockSheetOpen(false);
  }

  async function handleAddDate() {
    if (!dateLabel.trim() || !dateValue) return;
    await addImportantDate({ label: dateLabel.trim(), date: new Date(dateValue).toISOString(), repeatsYearly });
    setDateLabel("");
    setDateValue("");
    setDateSheetOpen(false);
  }

  return (
    <>
      <PageHeader eyebrow="Takvim & Rutin" title="Zaman Çizelgesi" />
      <div className="px-5 mt-2 space-y-4 pb-4">
        {templates && templates.length > 0 && (
          <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => applyRoutineTemplate(t.id)}
                className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-2 text-[12.5px] font-medium text-[var(--color-text-primary)] min-h-9"
              >
                {t.name} uygula
              </button>
            ))}
          </div>
        )}

        <Button variant="accent" accentVar="--color-su" className="w-full" onClick={() => setBlockSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Blok Ekle
        </Button>

        {blocks && blocks.length > 0 ? (
          <Card>
            {blocks.map((b) => (
              <div key={b.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--color-border)] last:border-0">
                <button
                  onClick={() => toggleScheduleBlockCompleted(b.id, !b.completed)}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border shrink-0 ${b.completed ? "bg-[var(--color-su)] border-[var(--color-su)]" : "border-[var(--color-border-strong)]"}`}
                  aria-label="Tamamlandı"
                >
                  {b.completed && <Check className="h-3.5 w-3.5 text-black" />}
                </button>
                <span className="text-[12px] tabular-nums-tight text-[var(--color-text-tertiary)] w-11 shrink-0">{b.startTime}</span>
                <span className={`flex-1 text-[13.5px] ${b.completed ? "text-[var(--color-text-tertiary)] line-through" : "text-[var(--color-text-primary)]"}`}>{b.label}</span>
                <button onClick={() => deleteScheduleBlock(b.id)} className="p-1.5 -m-1.5 text-[var(--color-text-tertiary)]" aria-label="Sil">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="Bugün için plan yok" description="Bir rutin uygula ya da elle blok ekle." />
        )}

        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">Önemli günler</p>
            <button onClick={() => setDateSheetOpen(true)} className="text-[12px] font-semibold text-[var(--color-su)]">
              + Ekle
            </button>
          </div>
          {importantDates && importantDates.length > 0 ? (
            <Card>
              {importantDates
                .slice()
                .sort((a, b) => daysUntilNextOccurrence(a.date, a.repeatsYearly) - daysUntilNextOccurrence(b.date, b.repeatsYearly))
                .map((d) => {
                  const days = daysUntilNextOccurrence(d.date, d.repeatsYearly);
                  return (
                    <div key={d.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                      <span className="text-[13px] text-[var(--color-text-primary)]">{d.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-[var(--color-su)]">{days >= 0 ? `${days} gün` : "geçti"}</span>
                        <button onClick={() => deleteImportantDate(d.id)} className="p-1 text-[var(--color-text-tertiary)]" aria-label="Sil">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </Card>
          ) : (
            <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="Henüz önemli gün eklenmedi" />
          )}
        </div>
      </div>

      <Sheet open={blockSheetOpen} onOpenChange={setBlockSheetOpen} title="Blok Ekle">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Başlangıç</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>Bitiş</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Ne yapılacak</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <Button variant="accent" accentVar="--color-su" className="w-full" onClick={handleAddBlock}>
            Ekle
          </Button>
        </div>
      </Sheet>

      <Sheet open={dateSheetOpen} onOpenChange={setDateSheetOpen} title="Önemli Gün Ekle">
        <div className="space-y-4">
          <div>
            <Label>Ad</Label>
            <Input value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} placeholder="Örn. Doğum günü" />
          </div>
          <div>
            <Label>Tarih</Label>
            <Input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} />
          </div>
          <button onClick={() => setRepeatsYearly((v) => !v)} className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
            <span className={`h-5 w-5 rounded-md border flex items-center justify-center ${repeatsYearly ? "bg-[var(--color-su)] border-[var(--color-su)]" : "border-[var(--color-border-strong)]"}`}>
              {repeatsYearly && <Check className="h-3.5 w-3.5 text-black" />}
            </span>
            Her yıl tekrarla
          </button>
          <Button variant="accent" accentVar="--color-su" className="w-full" onClick={handleAddDate}>
            Ekle
          </Button>
        </div>
      </Sheet>
    </>
  );
}
