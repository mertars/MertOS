"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Greeting } from "@/components/home/greeting";
import { Dashboard } from "@/components/home/dashboard";
import { addWaterEntry, softDeleteWaterEntry } from "@/lib/db/repo/water";
import { addCigaretteEntry, softDeleteCigaretteEntry } from "@/lib/db/repo/cigarette";
import { showUndoToast } from "@/lib/store/toast-store";

export default function BugunPage() {
  return (
    <div className="space-y-5 pb-6">
      <Greeting />
      <Suspense fallback={null}>
        <QuickShortcutHandler />
      </Suspense>
      <Dashboard />
    </div>
  );
}

function QuickShortcutHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    const hizli = searchParams.get("hizli");
    if (!hizli || handled.current) return;
    handled.current = true;

    (async () => {
      if (hizli === "su") {
        const id = await addWaterEntry(250);
        showUndoToast("250 ml su eklendi", () => softDeleteWaterEntry(id));
      } else if (hizli === "sigara") {
        const id = await addCigaretteEntry();
        showUndoToast("Sigara kaydedildi", () => softDeleteCigaretteEntry(id));
      }
      router.replace("/bugun");
    })();
  }, [searchParams, router]);

  return null;
}
