"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useIsDesktop } from "@/components/fx/assistant-panel";
import { DesktopHome } from "@/components/fx/desktop-home";
import { TodayView } from "@/components/fx/today-view";
import { addWaterEntry, softDeleteWaterEntry } from "@/lib/db/repo/water";
import { addCigaretteEntry, softDeleteCigaretteEntry } from "@/lib/db/repo/cigarette";
import { showUndoToast } from "@/lib/store/toast-store";

// Bugün (Faz 3): telefonda günün kartları; bilgisayarda 3 sütunlu ana görünüm.
// Eski MertOS paneli (skor halkaları, su/sigara…) Sağlık sekmesine taşındı.
export default function BugunPage() {
  const desktop = useIsDesktop();
  return (
    <>
      {desktop ? <DesktopHome /> : <TodayView />}
      <Suspense fallback={null}>
        <QuickShortcutHandler />
      </Suspense>
    </>
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
