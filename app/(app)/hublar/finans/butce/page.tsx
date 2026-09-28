"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { endOfMonth, startOfMonth } from "date-fns";
import { PiggyBank, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/stat";
import { deleteCategoryBudget, getCategoryBudgets, getTransactionsInRange, setCategoryBudget } from "@/lib/db/repo/finans";

export default function ButcePage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const now = new Date();

  const budgets = useLiveQuery(() => getCategoryBudgets(), []);
  const transactions = useLiveQuery(() => getTransactionsInRange(startOfMonth(now), endOfMonth(now)), []);

  const spendByCategory = new Map<string, number>();
  for (const t of transactions ?? []) {
    if ((t.type ?? "gider") !== "gider") continue;
    spendByCategory.set(t.category, (spendByCategory.get(t.category) ?? 0) + t.amount);
  }

  async function handleAdd() {
    if (!category.trim() || !limit) return;
    await setCategoryBudget(category.trim(), Number(limit));
    setCategory("");
    setLimit("");
    setSheetOpen(false);
  }

  return (
    <>
      <PageHeader eyebrow="Finans" title="Bütçe" />
      <div className="px-5 mt-2 space-y-3 pb-4">
        {budgets && budgets.length > 0 ? (
          budgets.map((b) => {
            const spent = spendByCategory.get(b.category) ?? 0;
            const pct = Math.min(100, Math.round((spent / b.monthlyLimitTl) * 100));
            const over = spent > b.monthlyLimitTl;
            return (
              <Card key={b.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">{b.category}</p>
                  <button onClick={() => deleteCategoryBudget(b.id)} className="p-1 text-[var(--color-text-tertiary)]" aria-label="Sil">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ProgressBar value={pct} colorVar={over ? "--color-danger" : "--color-finans"} className="mb-1.5" />
                <p className={`text-[11.5px] ${over ? "text-[var(--color-danger)]" : "text-[var(--color-text-secondary)]"}`}>
                  {spent.toLocaleString("tr-TR")} ₺ / {b.monthlyLimitTl.toLocaleString("tr-TR")} ₺
                </p>
              </Card>
            );
          })
        ) : (
          <EmptyState icon={<PiggyBank className="h-6 w-6" />} title="Henüz bütçe belirlenmedi" />
        )}

        <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Kategori Bütçesi Ekle
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Bütçe Ekle">
        <div className="space-y-4">
          <div>
            <Label>Kategori</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Örn. Yemek" />
          </div>
          <div>
            <Label>Aylık limit (₺)</Label>
            <Input inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>
          <Button variant="accent" accentVar="--color-finans" className="w-full" onClick={handleAdd}>
            Kaydet
          </Button>
        </div>
      </Sheet>
    </>
  );
}
