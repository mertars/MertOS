"use client";

import { Suspense, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, ListChecks, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AutoOpenFromQuery } from "@/components/shell/auto-open-from-query";
import { AddTaskSheet } from "@/components/modules/uretkenlik/add-task-sheet";
import { getTasksByBucket, restoreTask, softDeleteTask, toggleTaskDone } from "@/lib/db/repo/uretkenlik";
import { showUndoToast } from "@/lib/store/toast-store";
import { cn } from "@/lib/utils";
import type { Task, TaskBucket } from "@/lib/db/types";

const BUCKETS: { value: TaskBucket; label: string }[] = [
  { value: "bugun", label: "Bugün" },
  { value: "yakinda", label: "Yakında" },
  { value: "bir-gun", label: "Bir gün" },
];

const PRIORITY_COLOR: Record<Task["priority"], string> = { dusuk: "var(--color-text-tertiary)", orta: "var(--color-warning)", yuksek: "var(--color-danger)" };

export default function GorevlerPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const bugun = useLiveQuery(() => getTasksByBucket("bugun"), []);
  const yakinda = useLiveQuery(() => getTasksByBucket("yakinda"), []);
  const birGun = useLiveQuery(() => getTasksByBucket("bir-gun"), []);
  const byBucket: Record<TaskBucket, Task[] | undefined> = { bugun, yakinda, "bir-gun": birGun };

  const totalOpen = [bugun, yakinda, birGun].reduce((s, arr) => s + (arr?.filter((t) => !t.done).length ?? 0), 0);

  return (
    <>
      <PageHeader eyebrow="Üretkenlik" title="Görevler" />
      <Suspense fallback={null}>
        <AutoOpenFromQuery targetPath="/hublar/uretkenlik/gorevler" onOpen={() => setSheetOpen(true)} />
      </Suspense>
      <div className="px-5 mt-2 space-y-4 pb-4">
        <Button variant="accent" accentVar="--color-uretkenlik" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Görev Ekle
        </Button>

        {totalOpen === 0 && bugun && yakinda && birGun ? (
          <EmptyState icon={<ListChecks className="h-6 w-6" />} title="Görev listesi boş" description="Yukarıdan bir görev ekleyerek başla." />
        ) : (
          BUCKETS.map(({ value, label }) => {
            const tasks = byBucket[value];
            if (!tasks || tasks.length === 0) return null;
            return (
              <div key={value}>
                <p className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-2 px-1">{label}</p>
                <Card>
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--color-border)] last:border-0">
                      <button
                        onClick={() => toggleTaskDone(t.id, !t.done)}
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border shrink-0",
                          t.done ? "bg-[var(--color-uretkenlik)] border-[var(--color-uretkenlik)]" : "border-[var(--color-border-strong)]",
                        )}
                        aria-label={t.done ? "Tamamlanmadı olarak işaretle" : "Tamamlandı olarak işaretle"}
                      >
                        {t.done && <Check className="h-3.5 w-3.5 text-white" />}
                      </button>
                      <span
                        className={cn("flex-1 text-[13.5px]", t.done ? "text-[var(--color-text-tertiary)] line-through" : "text-[var(--color-text-primary)]")}
                      >
                        {t.title}
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLOR[t.priority] }} />
                      <button
                        onClick={async () => {
                          await softDeleteTask(t.id);
                          showUndoToast("Görev silindi", () => restoreTask(t.id));
                        }}
                        className="p-1.5 -m-1.5 text-[var(--color-text-tertiary)]"
                        aria-label="Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </Card>
              </div>
            );
          })
        )}
      </div>

      <AddTaskSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
