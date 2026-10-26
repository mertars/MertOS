"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Pencil, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteMemoryNote, fetchMemories, restoreMemoryNote, updateMemoryNote, type ClientMemory } from "@/lib/assistant/client";
import { MEMORY_CATEGORIES, MEMORY_CATEGORY_LABELS } from "@/lib/assistant/memory-extract";
import { normalizeTr } from "@/lib/assistant/text";
import { showUndoToast, useToastStore } from "@/lib/store/toast-store";

// Hafızam (Faz 3): asistanın sohbetlerden çıkardığı notlar. Görev dosyası § 8:
// notta yalnızca iki işlem var — düzelt ve sil. Elle not ekleme bilinçli olarak
// yok; asistan Mert'in kendi söylediklerinden not alır.

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });

export default function HafizamPage() {
  const [memories, setMemories] = useState<ClientMemory[] | null>(null);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState("");
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    fetchMemories()
      .then((r) => setMemories(r.memories))
      .catch((e) => setError(e instanceof Error ? e.message : "Notlar okunamadı."));
  }, []);

  const groups = useMemo(() => {
    const q = normalizeTr(query);
    const list = (memories ?? []).filter((m) => !q || normalizeTr(m.text).includes(q));
    return MEMORY_CATEGORIES.map((c) => ({ category: c, items: list.filter((m) => m.category === c) })).filter((g) => g.items.length);
  }, [memories, query]);

  async function save(m: ClientMemory, text: string) {
    try {
      const { memory } = await updateMemoryNote(m.id, text);
      setMemories((list) => (list ?? []).map((x) => (x.id === m.id ? memory : x)));
      return true;
    } catch (e) {
      push({ title: "Kaydedilemedi", description: e instanceof Error ? e.message : undefined, variant: "danger" });
      return false;
    }
  }

  async function remove(m: ClientMemory) {
    try {
      await deleteMemoryNote(m.id);
      setMemories((list) => (list ?? []).filter((x) => x.id !== m.id));
      showUndoToast("Not silindi", async () => {
        try {
          const { memory } = await restoreMemoryNote(m.id);
          setMemories((list) => [memory, ...(list ?? [])].sort((a, b) => b.id - a.id));
        } catch {
          push({ title: "Geri alınamadı", variant: "danger" });
        }
      });
    } catch (e) {
      push({ title: "Silinemedi", description: e instanceof Error ? e.message : undefined, variant: "danger" });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Asistan"
        title="Hafızam"
        right={
          <Link
            href="/asistan"
            aria-label="Sohbete dön"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-card-raised)] border border-[var(--color-border-strong)] text-[var(--color-text-secondary)]"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </Link>
        }
      />
      <div className="px-5 mt-2 pb-32 space-y-3">
        <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
          Asistanın sohbetlerden aldığı notlar. Yanlış olanı düzeltebilir ya da silebilirsiniz; silinen not bir daha kullanılmaz.
        </p>

        {memories && memories.length > 0 && (
          <label className="flex h-11 items-center gap-2 rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-card-raised)] px-3.5">
            <Search className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Notlarda ara…"
              aria-label="Notlarda ara"
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--color-text-tertiary)]"
            />
          </label>
        )}

        {error && <Card className="text-[13px] text-[var(--color-text-secondary)]">{error}</Card>}
        {!memories && !error && <Card className="h-24 animate-pulse" />}
        {memories?.length === 0 && (
          <Card className="text-[13px] text-[var(--color-text-secondary)]">
            Henüz not yok. Sohbette “Ispanağı sevmem” gibi bir şey söylediğinizde asistan not alır.
          </Card>
        )}
        {memories && memories.length > 0 && groups.length === 0 && <p className="text-[13px] text-[var(--color-text-tertiary)]">Aramayla eşleşen not yok.</p>}

        {groups.map((g) => (
          <Card key={g.category}>
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-[13px] font-semibold">{MEMORY_CATEGORY_LABELS[g.category]}</p>
              <p className="text-[12px] tabular-nums text-[var(--color-text-tertiary)]">{g.items.length}</p>
            </div>
            <ul className="divide-y divide-[var(--color-border)]">
              {g.items.map((m) => (
                <MemoryRow key={m.id} memory={m} onSave={save} onDelete={remove} />
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}

function MemoryRow({
  memory,
  onSave,
  onDelete,
}: {
  memory: ClientMemory;
  onSave: (m: ClientMemory, text: string) => Promise<boolean>;
  onDelete: (m: ClientMemory) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(memory.text);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (value.length < 2 || saving) return;
    if (value === memory.text) return setEditing(false);
    setSaving(true);
    if (await onSave(memory, value)) setEditing(false);
    setSaving(false);
  }

  if (editing) {
    return (
      <li className="py-2.5">
        <form onSubmit={submit} className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            rows={2}
            autoFocus
            aria-label="Notu düzelt"
            className="w-full resize-none rounded-[12px] border border-[var(--color-border-strong)] bg-[var(--color-card-raised)] px-3 py-2 text-[14px] leading-snug outline-none focus:border-white/30"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setText(memory.text);
                setEditing(false);
              }}
            >
              Vazgeç
            </Button>
            <Button type="submit" size="sm" disabled={saving || text.trim().length < 2}>
              Kaydet
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-2 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] leading-snug">{memory.text}</p>
        <p className="mt-0.5 text-[11.5px] text-[var(--color-text-tertiary)]">
          {DATE_FMT.format(new Date(memory.createdAt))}
          {memory.updatedAt !== memory.createdAt && " · düzeltildi"}
          {memory.lastUsedAt && ` · son kullanım ${DATE_FMT.format(new Date(memory.lastUsedAt))}`}
        </p>
      </div>
      <button onClick={() => setEditing(true)} aria-label="Notu düzelt" className="flex h-9 w-9 items-center justify-center text-[var(--color-text-secondary)]">
        <Pencil className="h-4 w-4" />
      </button>
      <button onClick={() => onDelete(memory)} aria-label="Notu sil" className="flex h-9 w-9 items-center justify-center text-[var(--color-text-secondary)]">
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
