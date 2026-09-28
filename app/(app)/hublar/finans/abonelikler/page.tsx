"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Check, Plus, Repeat, X } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { addSubscription, daysUntil, deactivateSubscription, getActiveSubscriptions, markSubscriptionPaid } from "@/lib/db/repo/finans";
import type { BillingCycle } from "@/lib/db/types";

export default function AbonelikerPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState<BillingCycle>("aylik");
  const [renewalDate, setRenewalDate] = useState(() => new Date().toISOString().slice(0, 10));

  const subs = useLiveQuery(() => getActiveSubscriptions(), []);
  const monthlyTotal = (subs ?? []).reduce((s, sub) => s + (sub.billingCycle === "aylik" ? sub.amountTl : sub.amountTl / 12), 0);

  async function handleAdd() {
    if (!name.trim() || !amount) return;
    await addSubscription({ name: name.trim(), amountTl: Number(amount), billingCycle: cycle, nextRenewalDate: new Date(renewalDate).toISOString() });
    setName("");
    setAmount("");
    setSheetOpen(false);
  }

  return (
    <>
      <PageHeader eyebrow="Finans" title="Abonelikler" />
      <div className="px-5 mt-2 space-y-4 pb-4">
        {subs && subs.length > 0 && (
          <Card className="flex items-center justify-between">
            <p className="text-[13px] text-[var(--color-text-secondary)]">Aylık toplam</p>
            <p className="text-[15px] font-bold tabular-nums-tight text-[var(--color-finans)]">{Math.round(monthlyTotal).toLocaleString("tr-TR")} ₺</p>
          </Card>
        )}

        {subs && subs.length > 0 ? (
          subs.map((s) => {
            const days = daysUntil(s.nextRenewalDate);
            return (
              <Card key={s.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">{s.name}</p>
                  <p className="text-[11.5px] text-[var(--color-text-tertiary)]">
                    {s.amountTl.toLocaleString("tr-TR")} ₺ / {s.billingCycle === "aylik" ? "ay" : "yıl"} · {format(new Date(s.nextRenewalDate), "d MMM", { locale: tr })}
                    {days <= 7 && days >= 0 && <span className="text-[var(--color-warning)]"> · {days} gün kaldı</span>}
                  </p>
                </div>
                <button onClick={() => markSubscriptionPaid(s.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-finans)]/15 text-[var(--color-finans)] shrink-0" aria-label="Ödendi işaretle">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => deactivateSubscription(s.id)} className="p-1.5 text-[var(--color-text-tertiary)]" aria-label="İptal et">
                  <X className="h-4 w-4" />
                </button>
              </Card>
            );
          })
        ) : (
          <EmptyState icon={<Repeat className="h-6 w-6" />} title="Henüz abonelik eklenmedi" />
        )}

        <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Abonelik Ekle
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Abonelik Ekle">
        <div className="space-y-4">
          <div>
            <Label>Ad</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Netflix" />
          </div>
          <div>
            <Label>Tutar (₺)</Label>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Periyot</Label>
            <Segmented
              options={[
                { value: "aylik", label: "Aylık" },
                { value: "yillik", label: "Yıllık" },
              ]}
              value={cycle}
              onChange={setCycle}
            />
          </div>
          <div>
            <Label>Sıradaki yenilenme</Label>
            <Input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
          </div>
          <Button variant="accent" accentVar="--color-finans" className="w-full" onClick={handleAdd}>
            Ekle
          </Button>
        </div>
      </Sheet>
    </>
  );
}
