"use client";

import * as Toast from "@radix-ui/react-toast";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useToastStore } from "@/lib/store/toast-store";

const VARIANT_ICON = {
  default: Info,
  success: CheckCircle2,
  danger: AlertCircle,
} as const;

const VARIANT_COLOR = {
  default: "var(--color-text-secondary)",
  success: "var(--color-success)",
  danger: "var(--color-danger)",
} as const;

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <Toast.Provider swipeDirection="right" duration={4200}>
      <AnimatePresence>
      {toasts.map((t) => {
        const Icon = VARIANT_ICON[t.variant ?? "default"];
        return (
        <Toast.Root
          key={t.id}
          onOpenChange={(open) => !open && dismiss(t.id)}
          asChild
          forceMount
        >
          <motion.li
            layout
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-card-raised)]/95 backdrop-blur-xl px-4 py-3 shadow-[var(--shadow-card)] min-w-[260px] max-w-[92vw]"
          >
            <Icon className="h-5 w-5 shrink-0" style={{ color: VARIANT_COLOR[t.variant ?? "default"] }} />
            <div className="flex-1 min-w-0">
              <Toast.Title className="text-[14px] font-medium text-[var(--color-text-primary)] truncate">
                {t.title}
              </Toast.Title>
              {t.description && (
                <Toast.Description className="text-[12px] text-[var(--color-text-secondary)]">
                  {t.description}
                </Toast.Description>
              )}
            </div>
            {t.action && (
              <Toast.Action asChild altText={t.action.label}>
                <button
                  onClick={t.action.onClick}
                  className="text-[13px] font-semibold text-[var(--color-su)] px-2 py-1 -mr-1 shrink-0"
                >
                  {t.action.label}
                </button>
              </Toast.Action>
            )}
          </motion.li>
        </Toast.Root>
        );
      })}
      </AnimatePresence>
      <Toast.Viewport asChild>
        <ol className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 p-0 m-0 list-none outline-none" />
      </Toast.Viewport>
    </Toast.Provider>
  );
}
