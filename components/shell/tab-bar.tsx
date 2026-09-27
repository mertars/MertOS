"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { TABS } from "@/lib/nav";
import { CURRENT_PHASE } from "@/lib/registry/modules";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

export function TabBar() {
  const pathname = usePathname();
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const visibleTabs = TABS.filter((t) => t.phase <= CURRENT_PHASE);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 pb-safe border-t border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-xl"
      aria-label="Ana gezinme"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {visibleTabs.map((tab) => {
          if (tab.isQuickAdd) {
            return (
              <button
                key={tab.id}
                onClick={() => openQuickAdd()}
                aria-label="Hızlı ekle"
                className="relative -mt-5 flex flex-col items-center gap-1 px-3"
              >
                <motion.span
                  whileTap={{ scale: 0.9 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-hareket)] text-black shadow-[var(--shadow-glow-lime)]"
                >
                  <tab.icon className="h-6 w-6" strokeWidth={2.5} />
                </motion.span>
              </button>
            );
          }

          const active = tab.href ? pathname === tab.href || pathname?.startsWith(tab.href + "/") : false;

          return (
            <Link
              key={tab.id}
              href={tab.href ?? "#"}
              className="flex min-w-14 flex-col items-center justify-center gap-1 px-3 py-2.5 min-h-11"
            >
              <tab.icon
                className={cn("h-6 w-6 transition-colors", active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]")}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                className={cn(
                  "text-[10.5px] font-medium transition-colors",
                  active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
