"use client";

import { useEffect, useState } from "react";
import { ensureDefaults } from "@/lib/db";
import { ThemeProvider } from "./theme-provider";
import { PinGate } from "./pin-gate";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureDefaults().finally(() => setReady(true));
  }, []);

  return (
    <>
      <ThemeProvider />
      {!ready ? (
        <div className="fixed inset-0 flex items-center justify-center bg-[var(--color-bg)]">
          <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[var(--color-hareket)] animate-spin" />
        </div>
      ) : (
        <PinGate>{children}</PinGate>
      )}
      <Toaster />
    </>
  );
}
