"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Archive, FolderKanban, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { addProject, archiveProject, getActiveProjects, getOpenTaskCountByProject } from "@/lib/db/repo/uretkenlik";

const COLORS = ["--color-uretkenlik", "--color-hareket", "--color-su", "--color-zihin", "--color-finans", "--color-sigara"];

export default function ProjelerPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [colorVar, setColorVar] = useState(COLORS[0]);
  const projects = useLiveQuery(() => getActiveProjects(), []);
  const counts = useLiveQuery(() => getOpenTaskCountByProject(), []);

  async function handleAdd() {
    if (!name.trim()) return;
    await addProject({ name: name.trim(), colorVar });
    setName("");
    setColorVar(COLORS[0]);
    setSheetOpen(false);
  }

  return (
    <>
      <PageHeader eyebrow="Üretkenlik" title="Projeler" />
      <div className="px-5 mt-2 space-y-3 pb-4">
        {projects && projects.length > 0 ? (
          projects.map((p) => (
            <Card key={p.id} className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: `var(${p.colorVar})` }} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">{p.name}</p>
                <p className="text-[11.5px] text-[var(--color-text-tertiary)]">{counts?.[p.id] ?? 0} açık görev</p>
              </div>
              <button onClick={() => archiveProject(p.id)} className="p-2 text-[var(--color-text-tertiary)]" aria-label="Arşivle">
                <Archive className="h-4 w-4" />
              </button>
            </Card>
          ))
        ) : (
          <EmptyState icon={<FolderKanban className="h-6 w-6" />} title="Henüz proje yok" />
        )}

        <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Proje Ekle
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Proje Ekle">
        <div className="space-y-4">
          <div>
            <Label>Ad</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Renk</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColorVar(c)}
                  className="h-9 w-9 rounded-full border-2"
                  style={{ backgroundColor: `var(${c})`, borderColor: colorVar === c ? "white" : "transparent" }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <Button variant="accent" accentVar="--color-uretkenlik" className="w-full" onClick={handleAdd}>
            Ekle
          </Button>
        </div>
      </Sheet>
    </>
  );
}
