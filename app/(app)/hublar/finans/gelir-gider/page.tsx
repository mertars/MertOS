"use client";

import { Suspense, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AutoOpenFromQuery } from "@/components/shell/auto-open-from-query";
import { AddTransactionSheet } from "@/components/modules/finans/add-transaction-sheet";
import { getTransactionsInRange, restoreTransaction, softDeleteTransaction, summarize } from "@/lib/db/repo/finans";
import { showUndoToast } from "@/lib/store/toast-store";
import { groupBy } from "@/lib/utils";

function formatTl(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
}

export default function GelirGiderPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const now = new Date();
  const transactions = useLiveQuery(() => getTransactionsInRange(startOfMonth(now), endOfMonth(now)), []);
  const { gelir, gider, net } = summarize(transactions ?? []);

  const grouped = transactions ? groupBy(transactions, (t) => t.date) : {};

  const byCategory = new Map<string, number>();
  for (const t of transactions ?? []) {
    if ((t.type ?? "gider") !== "gider") continue;
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }
  const maxCategory = Math.max(1, ...byCategory.values());

  return (
    <>
      <PageHeader eyebrow="Finans" title="Gelir-Gider" />
      <Suspense fallback={null}>
        <AutoOpenFromQuery targetPath="/hublar/finans/gelir-gider" onOpen={() => setSheetOpen(true)} />
      </Suspense>
      <div className="px-5 mt-2 space-y-4 pb-4">
        <Button variant="accent" accentVar="--color-finans" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          İşlem Ekle
        </Button>

        <Card>
          <p className="text-[12px] text-[var(--color-text-secondary)] mb-2">{format(now, "MMMM yyyy", { locale: tr })}</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-[15px] font-bold tabular-nums-tight text-[var(--color-success)]">{formatTl(gelir)}</p>
              <p className="text-[10.5px] text-[var(--color-text-tertiary)] mt-0.5">Gelir</p>
            </div>
            <div className="text-center">
              <p className="text-[15px] font-bold tabular-nums-tight text-[var(--color-danger)]">{formatTl(gider)}</p>
              <p className="text-[10.5px] text-[var(--color-text-tertiary)] mt-0.5">Gider</p>
            </div>
            <div className="text-center">
              <p className={`text-[15px] font-bold tabular-nums-tight ${net >= 0 ? "text-[var(--color-finans)]" : "text-[var(--color-danger)]"}`}>{formatTl(net)}</p>
              <p className="text-[10.5px] text-[var(--color-text-tertiary)] mt-0.5">Net</p>
            </div>
          </div>
        </Card>

        {byCategory.size > 0 && (
          <Card>
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">Kategori dağılımı</p>
            <div className="space-y-2.5">
              {Array.from(byCategory.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amount]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-20 text-[12px] text-[var(--color-text-secondary)] shrink-0">{cat}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--color-finans)]" style={{ width: `${(amount / maxCategory) * 100}%` }} />
                    </div>
                    <span className="text-[11.5px] tabular-nums-tight text-[var(--color-text-tertiary)] w-16 text-right">{formatTl(amount)}</span>
                  </div>
                ))}
            </div>
          </Card>
        )}

        {transactions && transactions.length > 0 ? (
          Object.entries(grouped).map(([date, rows]) => (
            <Card key={date}>
              <p className="text-[11.5px] font-medium text-[var(--color-text-tertiary)] mb-1.5">{format(new Date(date), "d MMMM EEEE", { locale: tr })}</p>
              {rows.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{t.category}</p>
                    {t.note && <p className="text-[11px] text-[var(--color-text-tertiary)] truncate">{t.note}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[13px] font-semibold tabular-nums-tight ${(t.type ?? "gider") === "gelir" ? "text-[var(--color-success)]" : "text-[var(--color-text-primary)]"}`}>
                      {(t.type ?? "gider") === "gelir" ? "+" : "-"}
                      {formatTl(t.amount)}
                    </span>
                    <button
                      onClick={async () => {
                        await softDeleteTransaction(t.id);
                        showUndoToast("İşlem silindi", () => restoreTransaction(t.id));
                      }}
                      className="p-1 text-[var(--color-text-tertiary)]"
                      aria-label="Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </Card>
          ))
        ) : (
          <EmptyState icon={<Receipt className="h-6 w-6" />} title="Bu ay henüz işlem yok" />
        )}
      </div>

      <AddTransactionSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
