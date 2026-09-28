"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Hızlı Ekle'nin `?ekle=1` ile yönlendirdiği sayfalarda ekleme sheet'ini otomatik açar. */
export function AutoOpenFromQuery({ targetPath, onOpen }: { targetPath: string; onOpen: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shouldOpen = searchParams.get("ekle") === "1";

  useEffect(() => {
    if (!shouldOpen) return;
    onOpen();
    router.replace(targetPath);
  }, [shouldOpen, onOpen, router, targetPath]);

  return null;
}
