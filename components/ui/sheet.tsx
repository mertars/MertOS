"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

/** Aşağıdan açılan, swipe-to-dismiss destekli bottom sheet. */
export function Sheet({ open, onOpenChange, children, title, description, className }: SheetProps) {
  const dragControls = useDragControls();

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 120 || info.velocity.y > 600) onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild aria-describedby={description ? "sheet-desc" : undefined}>
              <motion.div
                className={cn(
                  "fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-[28px] border-t border-[var(--color-border-strong)] bg-[var(--color-card)]/95 backdrop-blur-xl pb-safe focus:outline-none",
                  className,
                )}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 32, stiffness: 320 }}
                drag="y"
                dragControls={dragControls}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={handleDragEnd}
              >
                <div
                  className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
                  onPointerDown={(e) => dragControls.start(e)}
                >
                  <div className="h-1.5 w-10 rounded-full bg-white/20" />
                </div>
                <div className="px-5 pt-1 pb-2">
                  <Dialog.Title className="text-lg font-bold text-[var(--color-text-primary)]">{title}</Dialog.Title>
                  {description && (
                    <Dialog.Description id="sheet-desc" className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
                      {description}
                    </Dialog.Description>
                  )}
                </div>
                <div className="px-5 pb-6">{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
