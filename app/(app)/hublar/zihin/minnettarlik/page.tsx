"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { addGratitudeEntry, getAllGratitudeEntries, getGratitudeEntryForToday } from "@/lib/db/repo/zihin";

export default function MinnettarlikPage() {
  const today = useLiveQuery(() => getGratitudeEntryForToday(), []);
  const all = useLiveQuery(() => getAllGratitudeEntries(), []);
  const [items, setItems] = useState(["", "", ""]);

  async function handleSave() {
    if (items.every((i) => !i.trim())) return;
    await addGratitudeEntry(items);
    setItems(["", "", ""]);
  }

  const past = (all ?? []).filter((e) => e.id !== today?.id);

  return (
    <>
      <PageHeader eyebrow="Zihin" title="Minnettarlık" />
      <div className="px-5 mt-2 space-y-4 pb-4">
        {today ? (
          <Card>
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2">Bugün minnettarsın</p>
            <ul className="space-y-1.5">
              {today.items.map((it, i) => (
                <li key={i} className="text-[13.5px] text-[var(--color-text-primary)] flex gap-2">
                  <Star className="h-4 w-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
                  {it}
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card>
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">Bugün neye minnettarsın?</p>
            <div className="space-y-2.5">
              {items.map((it, i) => (
                <Input
                  key={i}
                  value={it}
                  onChange={(e) => setItems((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
                  placeholder={`${i + 1}. madde`}
                />
              ))}
            </div>
            <Button variant="accent" accentVar="--color-zihin" className="w-full mt-3" onClick={handleSave}>
              Kaydet
            </Button>
          </Card>
        )}

        {past.length > 0 ? (
          <div className="space-y-3">
            {past.map((e) => (
              <Card key={e.id}>
                <p className="text-[12px] font-medium text-[var(--color-text-tertiary)] mb-1.5">{format(new Date(e.date), "d MMMM", { locale: tr })}</p>
                <ul className="space-y-1">
                  {e.items.map((it, i) => (
                    <li key={i} className="text-[13px] text-[var(--color-text-secondary)]">
                      • {it}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        ) : (
          !today && <EmptyState icon={<Star className="h-6 w-6" />} title="Henüz kayıt yok" description="Her gün 3 şey yazmak bile fark yaratır." />
        )}
      </div>
    </>
  );
}
