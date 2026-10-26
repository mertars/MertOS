"use client";

import { useEffect } from "react";

/**
 * Faz 3 tasarımı her zaman parlak siyah (docs/gorev-dosyasi/faz-3-tasarim.md) — eski
 * Koyu/Açık/Sistem seçimi kaldırıldı. `settings.theme` verisi IndexedDB'de duruyor
 * ama artık uygulanmıyor; eski modül sayfaları da koyu token'larla açılır.
 */
export function ThemeProvider() {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);
  return null;
}
