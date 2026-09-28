"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Check, Flag, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/stat";
import { addLongTermGoal, deleteLongTermGoal, getAllLongTermGoals, toggleMilestone } from "@/lib/db/repo/aliskanlik";
import { computeLinkedMetricProgress } from "@/lib/aliskanlik/linked-metric";
import type { LongTermGoal } from "@/lib/db/types";

export default function HedeflerPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [milestonesText, setMilestonesText] = useState("");

  const goals = useLiveQuery(() => getAllLongTermGoals(), []);

  async function handleAdd() {
    if (!title.trim()) return;
    await addLongTermGoal({
      title: title.trim(),
      description: description || undefined,
      targetDate: targetDate || undefined,
      milestones: milestonesText.split("\n").map((s) => s.trim()),
    });
    setTitle("");
    setDescription("");
    setTargetDate("");
    setMilestonesText("");
    setSheetOpen(false);
  }

  return (
    <>
      <PageHeader eyebrow="Alışkanlık & Hedef" title="Uzun Vadeli Hedefler" />
      <div className="px-5 mt-2 space-y-3 pb-4">
        {goals && goals.length > 0 ? (
          goals.map((g) => <GoalCard key={g.id} goal={g} />)
        ) : (
          <EmptyState icon={<Flag className="h-6 w-6" />} title="Henüz hedef yok" />
        )}

        <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Hedef Ekle
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Hedef Ekle">
        <div className="space-y-4">
          <div>
            <Label>Başlık</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn. 10 km'yi 55 dakikanın altında koş" />
          </div>
          <div>
            <Label>Açıklama (opsiyonel)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Son tarih (opsiyonel)</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <div>
            <Label>Kilometre taşları (her satıra bir tane)</Label>
            <textarea
              value={milestonesText}
              onChange={(e) => setMilestonesText(e.target.value)}
              rows={3}
              className="w-full rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-card-raised)] px-3.5 py-2.5 text-[13px] text-[var(--color-text-primary)] outline-none resize-none"
            />
          </div>
          <Button variant="accent" accentVar="--color-uyku" className="w-full" onClick={handleAdd}>
            Ekle
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function GoalCard({ goal }: { goal: LongTermGoal }) {
  const autoProgress = useLiveQuery(() => computeLinkedMetricProgress(goal), [goal.id]);
  const milestoneProgress = goal.milestones.length > 0 ? Math.round((goal.milestones.filter((m) => m.done).length / goal.milestones.length) * 100) : null;
  const pct = autoProgress ?? goal.manualProgressPercent ?? milestoneProgress ?? 0;

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">{goal.title}</p>
        <button onClick={() => deleteLongTermGoal(goal.id)} className="p-1 text-[var(--color-text-tertiary)]" aria-label="Sil">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {goal.description && <p className="text-[12px] text-[var(--color-text-secondary)] mb-2">{goal.description}</p>}
      <ProgressBar value={pct} colorVar="--color-uyku" className="mb-1.5" />
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11.5px] text-[var(--color-text-tertiary)]">%{pct}</span>
        {goal.targetDate && <span className="text-[11.5px] text-[var(--color-text-tertiary)]">{format(new Date(goal.targetDate), "d MMM yyyy", { locale: tr })}</span>}
      </div>
      {goal.milestones.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {goal.milestones.map((m) => (
            <button key={m.id} onClick={() => toggleMilestone(goal.id, m.id, !m.done)} className="flex items-center gap-2 w-full text-left">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border shrink-0 ${m.done ? "bg-[var(--color-uyku)] border-[var(--color-uyku)]" : "border-[var(--color-border-strong)]"}`}
              >
                {m.done && <Check className="h-3 w-3 text-white" />}
              </span>
              <span className={`text-[12.5px] ${m.done ? "text-[var(--color-text-tertiary)] line-through" : "text-[var(--color-text-secondary)]"}`}>{m.label}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
