"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { UtensilsCrossed, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getMealEntriesForDate, getPhotoBlob, restoreMealEntry, softDeleteMealEntry } from "@/lib/db/repo/meals";
import { useBlobUrl } from "@/lib/hooks/use-blob-url";
import { showUndoToast } from "@/lib/store/toast-store";
import type { MealEntry, MealType } from "@/lib/db/types";
import { groupBy } from "@/lib/utils";

const MEAL_TYPE_LABEL: Record<MealType, string> = {
  kahvalti: "Kahvaltı",
  ogle: "Öğle Yemeği",
  aksam: "Akşam Yemeği",
  atistirmalik: "Atıştırmalık",
};

export function TodayMealsList() {
  const entries = useLiveQuery(() => getMealEntriesForDate(), []);

  if (!entries) return null;

  if (entries.length === 0) {
    return (
      <Card>
        <EmptyState icon={<UtensilsCrossed className="h-6 w-6" />} title="Bugün henüz öğün yok" description="Yukarıdan bir öğün ekleyerek başla." />
      </Card>
    );
  }

  const grouped = groupBy(entries, (e) => e.mealType);

  return (
    <div className="space-y-3">
      {(Object.keys(MEAL_TYPE_LABEL) as MealType[])
        .filter((t) => grouped[t]?.length)
        .map((type) => (
          <Card key={type}>
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2">{MEAL_TYPE_LABEL[type]}</p>
            {grouped[type].map((entry) => (
              <MealRow key={entry.id} entry={entry} />
            ))}
          </Card>
        ))}
    </div>
  );
}

function MealRow({ entry }: { entry: MealEntry }) {
  const photoUrl = useBlobUrl(() => (entry.photoId ? getPhotoBlob(entry.photoId) : Promise.resolve(undefined)), [entry.photoId]);
  const kcal = entry.items.reduce((s, i) => s + i.macro.kcal, 0);

  async function handleDelete() {
    await softDeleteMealEntry(entry.id);
    showUndoToast("Öğün silindi", () => restoreMealEntry(entry.id));
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-[var(--color-border)] last:border-0">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-11 w-11 rounded-xl object-cover shrink-0" />
      ) : (
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-beslenme)]/12 shrink-0">
          <UtensilsCrossed className="h-4 w-4 text-[var(--color-beslenme)]" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">
          {entry.items.map((i) => i.name).join(", ")}
        </p>
        <p className="text-[11.5px] text-[var(--color-text-tertiary)]">
          {format(new Date(entry.at), "HH:mm")} · {kcal} kcal
        </p>
      </div>
      <button onClick={handleDelete} className="p-2 -m-2 text-[var(--color-text-tertiary)]" aria-label="Sil">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
