"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { addTransaction } from "@/lib/db/repo/finans";
import type { TransactionType } from "@/lib/db/types";

const EXPENSE_CATEGORIES = ["Yemek", "Ulaşım", "Market", "Fatura", "Eğlence", "Sağlık", "Abonelik", "Diğer"];
const INCOME_CATEGORIES = ["Maaş", "Ek Gelir", "Yatırım", "Diğer"];

export function AddTransactionSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [type, setType] = useState<TransactionType>("gider");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [note, setNote] = useState("");

  const categories = type === "gider" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  async function handleSave() {
    const value = Number(amount);
    if (!value || value <= 0) return;
    await addTransaction({ type, amount: value, category, note: note || undefined });
    setAmount("");
    setNote("");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="İşlem Ekle">
      <div className="space-y-4">
        <Segmented
          options={[
            { value: "gider", label: "Gider" },
            { value: "gelir", label: "Gelir" },
          ]}
          value={type}
          onChange={(v) => {
            setType(v);
            setCategory(v === "gider" ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
          }}
        />

        <div>
          <Label>Tutar (₺)</Label>
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </div>

        <div>
          <Label>Kategori</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
                  category === c ? "bg-[var(--color-finans)] text-black" : "bg-[var(--color-card-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Not (opsiyonel)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <Button variant="accent" accentVar="--color-finans" className="w-full" onClick={handleSave}>
          Kaydet
        </Button>
      </div>
    </Sheet>
  );
}
