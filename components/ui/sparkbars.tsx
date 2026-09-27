"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SparkPoint {
  label: string;
  value: number;
}

/** 7 günlük mini çubuk grafik — hub özetleri için hafif, bağımlılıksız sparkline. */
export function Sparkbars({
  data,
  colorVar,
  height = 56,
  className,
}: {
  data: SparkPoint[];
  colorVar: string;
  height?: number;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className={cn("flex items-end gap-1.5", className)} style={{ height }}>
      {data.map((d, i) => {
        const pct = Math.max(0.04, d.value / max);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full flex-1 flex items-end rounded-full overflow-hidden bg-white/[0.05]">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${pct * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                className="w-full rounded-full"
                style={{ backgroundColor: `var(${colorVar})` }}
              />
            </div>
            <span className="text-[10px] text-[var(--color-text-tertiary)]">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
