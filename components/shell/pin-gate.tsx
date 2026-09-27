"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, Lock } from "lucide-react";
import { useSettings } from "@/lib/hooks/db-hooks";
import { useLockStore } from "@/lib/store/lock-store";
import { verifyPin } from "@/lib/pin/crypto";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "geri"];

export function PinGate({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const unlocked = useLockStore((s) => s.unlocked);
  const unlock = useLockStore((s) => s.unlock);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const pinLength = settings?.pinLength ?? 4;
  const needsPin = Boolean(settings?.pinEnabled && settings.pinHash && settings.pinSalt);

  if (settings === undefined) return null; // ilk yüklenme — çakma yok
  if (!needsPin || unlocked) return <>{children}</>;

  function handleDigit(key: string) {
    if (checking || entry.length >= pinLength) return;
    const next = entry + key;
    setEntry(next);
    if (next.length === pinLength) {
      setChecking(true);
      verifyPin(next, settings!.pinSalt!, settings!.pinHash!).then((ok) => {
        if (ok) {
          unlock();
        } else {
          setError(true);
          setTimeout(() => {
            setEntry("");
            setError(false);
            setChecking(false);
          }, 420);
        }
      });
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--color-bg)] pt-safe pb-safe px-6">
      <div className="flex flex-col items-center gap-2 mb-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 mb-2">
          <Lock className="h-5 w-5 text-[var(--color-text-secondary)]" />
        </div>
        <p className="text-[17px] font-semibold text-[var(--color-text-primary)]">MertOS kilitli</p>
        <p className="text-[13px] text-[var(--color-text-secondary)]">Devam etmek için PIN gir</p>
      </div>

      <motion.div
        animate={error ? { x: [0, -10, 10, -8, 8, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex gap-4 mb-12"
      >
        {Array.from({ length: pinLength }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-3.5 w-3.5 rounded-full border transition-colors",
              i < entry.length
                ? error
                  ? "bg-[var(--color-danger)] border-[var(--color-danger)]"
                  : "bg-[var(--color-text-primary)] border-[var(--color-text-primary)]"
                : "border-[var(--color-border-strong)]",
            )}
          />
        ))}
      </motion.div>

      <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
        <AnimatePresence>
          {KEYS.map((key, i) => {
            if (key === "") return <div key={`empty-${i}`} />;
            if (key === "geri") {
              return (
                <button
                  key="geri"
                  onClick={() => setEntry((e) => e.slice(0, -1))}
                  className="flex h-16 w-16 items-center justify-center justify-self-center rounded-full text-[var(--color-text-secondary)] active:bg-white/5"
                  aria-label="Sil"
                >
                  <Delete className="h-5 w-5" />
                </button>
              );
            }
            return (
              <button
                key={key}
                onClick={() => handleDigit(key)}
                className="flex h-16 w-16 items-center justify-center justify-self-center rounded-full text-2xl font-medium text-[var(--color-text-primary)] bg-white/[0.04] active:bg-white/10 transition-colors"
              >
                {key}
              </button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
