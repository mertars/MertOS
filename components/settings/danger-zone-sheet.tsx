"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { eraseAllData } from "@/lib/backup/export-import";
import { ensureDefaults } from "@/lib/db";

export function DangerZoneSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setBusy(true);
    await eraseAllData();
    await ensureDefaults();
    setBusy(false);
    onOpenChange(false);
    setConfirmed(false);
    router.replace("/bugun");
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setConfirmed(false);
      }}
      title="Tüm veriyi sil"
    >
      <div className="flex flex-col items-center gap-4 text-center py-2">
        <AlertTriangle className="h-8 w-8 text-[var(--color-danger)]" />
        <p className="text-[13.5px] text-[var(--color-text-secondary)]">
          Bu işlem geri alınamaz. Tüm antrenman, su, sigara, program ve ayar verilerin cihazından kalıcı olarak
          silinecek.
        </p>

        {!confirmed ? (
          <Button variant="secondary" className="w-full" onClick={() => setConfirmed(true)}>
            Anladım, devam et
          </Button>
        ) : (
          <Button variant="danger" className="w-full" disabled={busy} onClick={handleDelete}>
            {busy ? "Siliniyor…" : "Evet, kalıcı olarak sil"}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
