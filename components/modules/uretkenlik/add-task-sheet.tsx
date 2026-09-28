"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { addTask, getActiveProjects } from "@/lib/db/repo/uretkenlik";
import type { TaskBucket, TaskPriority } from "@/lib/db/types";

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "dusuk", label: "Düşük" },
  { value: "orta", label: "Orta" },
  { value: "yuksek", label: "Yüksek" },
];

export function AddTaskSheet({
  open,
  onOpenChange,
  defaultBucket = "bugun",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultBucket?: TaskBucket;
}) {
  const [title, setTitle] = useState("");
  const [bucket, setBucket] = useState<TaskBucket>(defaultBucket);
  const [priority, setPriority] = useState<TaskPriority>("orta");
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const projects = useLiveQuery(() => getActiveProjects(), []);

  async function handleSave() {
    if (!title.trim()) return;
    await addTask({ title: title.trim(), bucket, priority, projectId });
    setTitle("");
    setProjectId(undefined);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Görev Ekle">
      <div className="space-y-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ne yapılacak?" autoFocus />

        <div>
          <Label>Ne zaman</Label>
          <Segmented
            options={[
              { value: "bugun", label: "Bugün" },
              { value: "yakinda", label: "Yakında" },
              { value: "bir-gun", label: "Bir gün" },
            ]}
            value={bucket}
            onChange={setBucket}
          />
        </div>

        <div>
          <Label>Öncelik</Label>
          <Segmented options={PRIORITY_OPTIONS} value={priority} onChange={setPriority} />
        </div>

        {projects && projects.length > 0 && (
          <div>
            <Label>Proje (opsiyonel)</Label>
            <div className="flex flex-wrap gap-2">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProjectId(projectId === p.id ? undefined : p.id)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-medium border ${
                    projectId === p.id ? "text-black" : "bg-[var(--color-card-raised)] text-[var(--color-text-secondary)] border-[var(--color-border)]"
                  }`}
                  style={projectId === p.id ? { backgroundColor: `var(${p.colorVar})`, borderColor: `var(${p.colorVar})` } : undefined}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button variant="accent" accentVar="--color-uretkenlik" className="w-full" onClick={handleSave}>
          Ekle
        </Button>
      </div>
    </Sheet>
  );
}
