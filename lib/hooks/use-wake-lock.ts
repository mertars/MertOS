"use client";

import { useEffect, useRef } from "react";

/** Canlı oturum ekranı açıkken telefonun kilitlenmesini engeller (Wake Lock API, destekleniyorsa). */
export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let cancelled = false;

    async function request() {
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
      } catch {
        // Sessizce yoksay (izin yok / desteklenmiyor) — kritik olmayan bir iyileştirme.
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible" && !sentinelRef.current) request();
    }

    request();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
    };
  }, [active]);
}
