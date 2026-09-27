"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { setPin } from "@/lib/pin/repo";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "geri"];

export function PinSetupSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [stage, setStage] = useState<"gir" | "tekrar">("gir");
  const [first, setFirst] = useState("");
  const [entry, setEntry] = useState("");
  const [error, setError] = useState(false);

  function reset() {
    setStage("gir");
    setFirst("");
    setEntry("");
    setError(false);
  }

  async function handleDigit(key: string) {
    if (entry.length >= 6) return;
    const next = entry + key;
    setEntry(next);
    if (next.length < 4) return;

    // 4 haneden sonra kullanıcı "Onayla" ile devam edebilir; 6 hanede otomatik onaylanır.
    if (next.length === 6) await confirmStage(next);
  }

  async function confirmStage(value: string) {
    if (stage === "gir") {
      setFirst(value);
      setEntry("");
      setStage("tekrar");
      return;
    }
    if (value === first) {
      await setPin(value);
      onOpenChange(false);
      reset();
    } else {
      setError(true);
      setTimeout(() => {
        setEntry("");
        setError(false);
      }, 400);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
      title={stage === "gir" ? "Yeni PIN belirle" : "PIN'i tekrar gir"}
      description="4-6 haneli bir PIN seç."
    >
      <div className="flex flex-col items-center gap-6 pt-2">
        <div className="flex gap-2.5">
          {Array.from({ length: Math.max(4, entry.length) }).map((_, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full border ${
                i < entry.length
                  ? error
                    ? "bg-[var(--color-danger)] border-[var(--color-danger)]"
                    : "bg-[var(--color-text-primary)] border-[var(--color-text-primary)]"
                  : "border-[var(--color-border-strong)]"
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-[260px]">
          {KEYS.map((key, i) => {
            if (key === "") return <div key={`e-${i}`} />;
            if (key === "geri") {
              return (
                <button key="geri" onClick={() => setEntry((e) => e.slice(0, -1))} className="h-14 w-14 justify-self-center rounded-full text-[var(--color-text-secondary)]">
                  Sil
                </button>
              );
            }
            return (
              <button
                key={key}
                onClick={() => handleDigit(key)}
                className="h-14 w-14 justify-self-center rounded-full text-xl font-medium bg-white/[0.04] text-[var(--color-text-primary)] active:bg-white/10"
              >
                {key}
              </button>
            );
          })}
        </div>

        {entry.length >= 4 && entry.length < 6 && (
          <Button variant="secondary" onClick={() => confirmStage(entry)} className="w-full">
            Devam Et ({entry.length} hane)
          </Button>
        )}
      </div>
    </Sheet>
  );
}
