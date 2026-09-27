"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative flex rounded-[14px] bg-[var(--color-card-raised)] border border-[var(--color-border)] p-1", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative flex-1 rounded-[10px] px-3 py-2 text-[13px] font-semibold transition-colors z-10 min-h-9",
              active ? "text-[var(--color-bg)]" : "text-[var(--color-text-secondary)]",
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${options.map((o) => o.value).join("-")}`}
                className="absolute inset-0 -z-10 rounded-[10px] bg-[var(--color-text-primary)]"
                transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
