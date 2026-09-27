"use client";

import { Sheet } from "@/components/ui/sheet";
import { useUiStore } from "@/lib/store/ui-store";
import { useOrderedByRecentUsage, useQuickAddActions } from "@/lib/quick-add/actions";

export function QuickAddSheet() {
  const open = useUiStore((s) => s.quickAddOpen);
  const close = useUiStore((s) => s.closeQuickAdd);
  const actions = useQuickAddActions(close);
  const ordered = useOrderedByRecentUsage(actions);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && close()} title="Hızlı Ekle" description="En sık kullandıkların üstte.">
      <div className="grid grid-cols-3 gap-3 pt-2">
        {ordered.map((action) => (
          <button
            key={action.key}
            onClick={() => action.run()}
            className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-raised)] py-4 px-2 active:scale-[0.96] transition-transform min-h-24"
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: `color-mix(in srgb, var(${action.accentVar}) 18%, transparent)` }}
            >
              <action.icon className="h-5 w-5" style={{ color: `var(${action.accentVar})` }} />
            </span>
            <span className="text-[12px] font-medium text-[var(--color-text-primary)] text-center leading-tight">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
