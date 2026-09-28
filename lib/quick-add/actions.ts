"use client";

import { useRouter } from "next/navigation";
import { Droplets, Cigarette, Activity, UtensilsCrossed, Sparkles, ListChecks, Receipt, Moon, type LucideIcon } from "lucide-react";
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
    {
      key: "ogun",
      label: "Öğün Ekle",
      icon: UtensilsCrossed,
      accentVar: "--color-beslenme",
      run: async () => {
        await bumpUsage("ogun");
        onDone();
        router.push("/hublar/beslenme/ogunler?ekle=1");
      },
    },
    {
      key: "ruh-hali",
      label: "Ruh Hali",
      icon: Sparkles,
      accentVar: "--color-zihin",
      run: async () => {
        await bumpUsage("ruh-hali");
        onDone();
        router.push("/hublar/zihin/ruh-hali?ekle=1");
      },
    },
    {
      key: "gorev",
      label: "Görev Ekle",
      icon: ListChecks,
      accentVar: "--color-uretkenlik",
      run: async () => {
        await bumpUsage("gorev");
        onDone();
        router.push("/hublar/uretkenlik/gorevler?ekle=1");
      },
    },
    {
      key: "islem",
      label: "İşlem Ekle",
      icon: Receipt,
      accentVar: "--color-finans",
      run: async () => {
        await bumpUsage("islem");
        onDone();
        router.push("/hublar/finans/gelir-gider?ekle=1");
      },
    },
    {
      key: "uyku",
      label: "Uyku Ekle",
      icon: Moon,
      accentVar: "--color-uyku",
      run: async () => {
        await bumpUsage("uyku");
        onDone();
        router.push("/hublar/beden/uyku?ekle=1");
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
