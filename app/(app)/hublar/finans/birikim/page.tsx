"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Target } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/stat";
import { addSavingsGoal, contributeToGoal, getSavingsGoals } from "@/lib/db/repo/finans";
import { db } from "@/lib/db/schema";

export default function BirikimPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState("");
  const goals = useLiveQuery(() => getSavingsGoals(), []);
  const totals = useLiveQuery(async () => {
    const rows = await db.savingsContributions.toArray();
    const map: Record<string, number> = {};
    for (const r of rows) map[r.goalId] = (map[r.goalId] ?? 0) + r.amount;
    return map;
  }, []);

  async function handleAdd() {
    if (!name.trim() || !target) return;
    await addSavingsGoal({ name: name.trim(), targetTl: Number(target) });
    setName("");
    setTarget("");
    setSheetOpen(false);
  }

  async function handleConfirmContribute() {
    const amount = Number(contributeAmount);
    if (!contributeGoalId || !amount || amount <= 0) return;
    await contributeToGoal(contributeGoalId, amount);
    setContributeGoalId(null);
    setContributeAmount("");
  }

  return (
    <>
      <PageHeader eyebrow="Finans" title="Birikim Hedefleri" />
      <div className="px-5 mt-2 space-y-3 pb-4">
        {goals && goals.length > 0 ? (
          goals.map((g) => {
            const current = totals?.[g.id] ?? 0;
            const pct = Math.min(100, Math.round((current / g.targetTl) * 100));
            return (
              <Card key={g.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">{g.name}</p>
                  {g.achievedAt && <span className="text-[10.5px] font-bold text-[var(--color-success)]">Tamamlandı 🎉</span>}
                </div>
                <ProgressBar value={pct} colorVar="--color-finans" className="mb-1.5" />
                <div className="flex items-center justify-between">
                  <p className="text-[11.5px] text-[var(--color-text-secondary)]">
                    {current.toLocaleString("tr-TR")} ₺ / {g.targetTl.toLocaleString("tr-TR")} ₺ ({pct}%)
                  </p>
                  <button onClick={() => setContributeGoalId(g.id)} className="text-[12px] font-semibold text-[var(--color-finans)]">
                    + Ekle
                  </button>
                </div>
              </Card>
            );
          })
        ) : (
          <EmptyState icon={<Target className="h-6 w-6" />} title="Henüz birikim hedefi yok" />
        )}

        <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Hedef Ekle
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Birikim Hedefi Ekle">
        <div className="space-y-4">
          <div>
            <Label>Ad</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Tatil" />
          </div>
          <div>
            <Label>Hedef tutar (₺)</Label>
            <Input inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <Button variant="accent" accentVar="--color-finans" className="w-full" onClick={handleAdd}>
            Ekle
          </Button>
        </div>
      </Sheet>

      <Sheet open={Boolean(contributeGoalId)} onOpenChange={(v) => !v && setContributeGoalId(null)} title="Birikime Ekle">
        <div className="space-y-4">
          <div>
            <Label>Tutar (₺)</Label>
            <Input inputMode="decimal" autoFocus value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} />
          </div>
          <Button variant="accent" accentVar="--color-finans" className="w-full" onClick={handleConfirmContribute}>
            Ekle
          </Button>
        </div>
      </Sheet>
    </>
  );
}
