"use client";

import { useEffect } from "react";
import { evaluateAndAwardBadges } from "@/lib/badges/engine";
import { BADGE_DEFINITIONS } from "@/lib/badges/definitions";
import { useToastStore } from "@/lib/store/toast-store";

/** Sayfa her açıldığında (mount) yeni kazanılan rozetleri kontrol eder ve kutlama toast'u gösterir. */
export function useBadgeEvaluation() {
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    let cancelled = false;
    evaluateAndAwardBadges().then((newlyEarnedIds) => {
      if (cancelled) return;
      for (const id of newlyEarnedIds) {
        const badge = BADGE_DEFINITIONS.find((b) => b.id === id);
        if (badge) push({ title: `🏅 Yeni rozet: ${badge.label}`, description: badge.description, variant: "success" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [push]);
}
