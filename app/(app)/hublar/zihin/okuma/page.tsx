"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/stat";
import { addBook, getAllBooks, updateBookProgress } from "@/lib/db/repo/zihin";

const STATUS_LABEL = { okunuyor: "Okunuyor", bitti: "Bitti", birakildi: "Bırakıldı" } as const;

export default function OkumaPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const books = useLiveQuery(() => getAllBooks(), []);

  async function handleAdd() {
    if (!title.trim()) return;
    await addBook({ title: title.trim(), author: author || undefined, totalPages: totalPages ? Number(totalPages) : undefined });
    setTitle("");
    setAuthor("");
    setTotalPages("");
    setSheetOpen(false);
  }

  return (
    <>
      <PageHeader eyebrow="Zihin" title="Okuma" />
      <div className="px-5 mt-2 space-y-3 pb-4">
        {books && books.length > 0 ? (
          books.map((b) => {
            const pct = b.totalPages ? Math.min(100, Math.round((b.currentPage / b.totalPages) * 100)) : 0;
            return (
              <Card key={b.id}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">{b.title}</p>
                  <span className="text-[10.5px] font-medium text-[var(--color-text-tertiary)]">{STATUS_LABEL[b.status]}</span>
                </div>
                {b.author && <p className="text-[11.5px] text-[var(--color-text-tertiary)] mb-2">{b.author}</p>}
                {b.totalPages ? (
                  <>
                    <ProgressBar value={pct} colorVar="--color-zihin" className="mb-1.5" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] text-[var(--color-text-secondary)]">
                        {b.currentPage} / {b.totalPages} sayfa
                      </span>
                      <input
                        type="number"
                        defaultValue={b.currentPage}
                        onBlur={(e) => updateBookProgress(b.id, Number(e.target.value) || 0)}
                        className="w-16 h-8 rounded-lg bg-[var(--color-card-raised)] border border-[var(--color-border)] px-2 text-[12px] text-center text-[var(--color-text-primary)]"
                      />
                    </div>
                  </>
                ) : (
                  <input
                    type="number"
                    placeholder="Sayfa"
                    defaultValue={b.currentPage || ""}
                    onBlur={(e) => updateBookProgress(b.id, Number(e.target.value) || 0)}
                    className="w-24 h-8 rounded-lg bg-[var(--color-card-raised)] border border-[var(--color-border)] px-2 text-[12px] text-center text-[var(--color-text-primary)]"
                  />
                )}
              </Card>
            );
          })
        ) : (
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title="Henüz kitap eklenmedi" />
        )}

        <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Kitap Ekle
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Kitap Ekle">
        <div className="space-y-3">
          <div>
            <Label>Başlık</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Yazar (opsiyonel)</Label>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div>
            <Label>Toplam sayfa (opsiyonel)</Label>
            <Input inputMode="numeric" value={totalPages} onChange={(e) => setTotalPages(e.target.value)} />
          </div>
          <Button variant="accent" accentVar="--color-zihin" className="w-full" onClick={handleAdd}>
            Ekle
          </Button>
        </div>
      </Sheet>
    </>
  );
}
