"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/hooks/db-hooks";

/** settings.theme'e göre <html data-theme="..."> uygular; "sistem" seçiliyse OS tercihini dinler. */
export function ThemeProvider() {
  const settings = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    const mode = settings?.theme ?? "koyu";

    function apply(resolved: "koyu" | "acik") {
      root.setAttribute("data-theme", resolved === "acik" ? "light" : "dark");
    }

    if (mode === "sistem") {
      const mq = window.matchMedia("(prefers-color-scheme: light)");
      apply(mq.matches ? "acik" : "koyu");
      const listener = (e: MediaQueryListEvent) => apply(e.matches ? "acik" : "koyu");
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }

    apply(mode);
  }, [settings?.theme]);

  return null;
}
