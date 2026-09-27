"use client";

import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import type { WaterEntry } from "@/lib/db/types";
import { restoreWaterEntry, softDeleteWaterEntry } from "@/lib/db/repo/water";
import { showUndoToast } from "@/lib/store/toast-store";

export function WaterEntryRow({ entry }: { entry: WaterEntry }) {
  async function handleDelete() {
    await softDeleteWaterEntry(entry.id);
    showUndoToast("Su kaydı silindi", () => restoreWaterEntry(entry.id));
  }

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--color-border)] last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-[13px] tabular-nums-tight text-[var(--color-text-secondary)] w-12">
          {format(new Date(entry.at), "HH:mm")}
        </span>
        <span className="text-[14px] font-medium text-[var(--color-text-primary)]">{entry.amountMl} ml</span>
      </div>
      <button onClick={handleDelete} className="p-2 -m-2 text-[var(--color-text-tertiary)]" aria-label="Sil">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
