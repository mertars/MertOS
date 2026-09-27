"use client";

import { useRouter } from "next/navigation";
import { Droplets, Cigarette, Activity, type LucideIcon } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { addWaterEntry, softDeleteWaterEntry } from "@/lib/db/repo/water";
import { addCigaretteEntry, softDeleteCigaretteEntry } from "@/lib/db/repo/cigarette";
import { showUndoToast } from "@/lib/store/toast-store";

export interface QuickAddAction {
  key: string;
  label: string;
  icon: LucideIcon;
  accentVar: string;
  run: () => Promise<void> | void;
}

const DEFAULT_WATER_ML = 250;

export function useQuickAddActions(onDone: () => void): QuickAddAction[] {
  const router = useRouter();

  return [
    {
      key: "su",
      label: `Su +${DEFAULT_WATER_ML} ml`,
      icon: Droplets,
      accentVar: "--color-su",
      run: async () => {
        const id = await addWaterEntry(DEFAULT_WATER_ML);
        await bumpUsage("su");
        onDone();
        showUndoToast(`${DEFAULT_WATER_ML} ml su eklendi`, () => softDeleteWaterEntry(id));
      },
    },
    {
      key: "sigara",
      label: "Sigara +1",
      icon: Cigarette,
      accentVar: "--color-sigara",
      run: async () => {
        const id = await addCigaretteEntry();
        await bumpUsage("sigara");
        onDone();
        showUndoToast("Sigara kaydedildi", () => softDeleteCigaretteEntry(id));
      },
    },
    {
      key: "antrenman",
      label: "Antrenman",
      icon: Activity,
      accentVar: "--color-hareket",
      run: async () => {
        await bumpUsage("antrenman");
        onDone();
        router.push("/hublar/beden/antrenman?ekle=1");
      },
    },
  ];
}

async function bumpUsage(actionKey: string) {
  const existing = await db.quickAddUsage.get(actionKey);
  if (existing) {
    await db.quickAddUsage.update(actionKey, { lastUsedAt: new Date().toISOString(), count: existing.count + 1 });
  } else {
    await db.quickAddUsage.add({ id: actionKey, actionKey, lastUsedAt: new Date().toISOString(), count: 1 });
  }
}

export function useOrderedByRecentUsage(actions: QuickAddAction[]) {
  const usage = useLiveQuery(() => db.quickAddUsage.toArray(), []);
  if (!usage) return actions;
  const order = new Map(usage.map((u) => [u.actionKey, u.lastUsedAt]));
  return [...actions].sort((a, b) => {
    const au = order.get(a.key);
    const bu = order.get(b.key);
    if (au && bu) return bu.localeCompare(au);
    if (au) return -1;
    if (bu) return 1;
    return 0;
  });
}
