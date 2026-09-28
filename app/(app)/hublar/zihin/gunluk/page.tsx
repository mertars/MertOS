"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { BookHeart, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { addJournalEntry, getAllJournalEntries, restoreJournalEntry, softDeleteJournalEntry } from "@/lib/db/repo/zihin";
import { showUndoToast } from "@/lib/store/toast-store";
import { randInt } from "@/lib/utils";

const PROMPTS = [
  "Bugün neyi iyi yaptın?",
  "Bugün seni ne zorladı?",
  "Yarın için tek bir niyetin ne?",
  "Bugün ne öğrendin?",
  "Şu an aklında en çok ne var?",
];

export default function GunlukPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [text, setText] = useState("");
  const [prompt] = useState(() => PROMPTS[randInt(0, PROMPTS.length - 1)]);
  const entries = useLiveQuery(() => getAllJournalEntries(), []);

  async function handleSave() {
    if (!text.trim()) return;
    const id = await addJournalEntry(text.trim(), prompt);
    setText("");
    setSheetOpen(false);
    showUndoToast("Not kaydedildi", () => restoreJournalEntry(id));
  }

  return (
    <>
      <PageHeader eyebrow="Zihin" title="Günlük" />
      <div className="px-5 mt-2 space-y-4 pb-4">
        <Button variant="accent" accentVar="--color-zihin" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Yeni Not
        </Button>

        {entries && entries.length > 0 ? (
          <div className="space-y-3">
            {entries.map((e) => (
              <Card key={e.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[12px] font-medium text-[var(--color-text-tertiary)]">{format(new Date(e.date), "d MMMM EEEE", { locale: tr })}</p>
                  <button
                    onClick={async () => {
                      await softDeleteJournalEntry(e.id);
                      showUndoToast("Not silindi", () => restoreJournalEntry(e.id));
                    }}
                    className="p-1 text-[var(--color-text-tertiary)]"
                    aria-label="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {e.prompt && <p className="text-[11.5px] italic text-[var(--color-zihin)] mb-1">{e.prompt}</p>}
                <p className="text-[13.5px] text-[var(--color-text-primary)] whitespace-pre-wrap">{e.text}</p>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={<BookHeart className="h-6 w-6" />} title="Henüz günlük notu yok" description="İlk notunu ekleyerek başla." />
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Yeni Not" description={prompt}>
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            autoFocus
            placeholder="Aklından geçenleri yaz…"
            className="w-full rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-card-raised)] px-3.5 py-3 text-[14px] text-[var(--color-text-primary)] outline-none resize-none"
          />
          <Button variant="accent" accentVar="--color-zihin" className="w-full" onClick={handleSave}>
            Kaydet
          </Button>
        </div>
      </Sheet>
    </>
  );
}
