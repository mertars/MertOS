"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Sparkles } from "lucide-react";
import { addMealFromTemplate, getMealTemplates } from "@/lib/db/repo/meals";
import { showUndoToast } from "@/lib/store/toast-store";
import { softDeleteMealEntry } from "@/lib/db/repo/meals";

export function TemplatesRow() {
  const templates = useLiveQuery(() => getMealTemplates(), []);
  if (!templates || templates.length === 0) return null;

  async function apply(templateId: string, name: string) {
    const id = await addMealFromTemplate(templateId);
    showUndoToast(`${name} eklendi`, () => softDeleteMealEntry(id));
  }

  return (
    <div>
      <p className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-2 px-1">Şablonlar — tek dokunuşla ekle</p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => apply(t.id, t.name)}
            className="flex items-center gap-1.5 shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-2 min-h-9"
          >
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-beslenme)]" />
            <span className="text-[12.5px] font-medium text-[var(--color-text-primary)] whitespace-nowrap">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
