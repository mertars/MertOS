"use client";

import { motion, useReducedMotion } from "framer-motion";
import { clamp } from "@/lib/utils";

/** Dolan şişe + dalga animasyonu. `percent` 0-100. */
export function WaterVisual({ percent, size = 160 }: { percent: number; size?: number }) {
  const reduceMotion = useReducedMotion();
  const pct = clamp(percent, 0, 100);
  const fillTop = 100 - pct; // yüzde olarak, container yüksekliğinin üstünden

  return (
    <div
      className="relative overflow-hidden rounded-[36px] border border-[var(--color-border-strong)] bg-white/[0.03]"
      style={{ width: size, height: size }}
    >
      <motion.div
        className="absolute inset-x-0 bottom-0"
        initial={false}
        animate={{ top: `${fillTop}%` }}
        transition={{ type: "spring", stiffness: 90, damping: 18 }}
      >
        <div className="relative h-[999px] -mt-4">
          <svg
            className="absolute -top-4 left-0 w-[200%] h-5"
            style={{ animation: reduceMotion ? undefined : "mertos-wave 3.2s linear infinite" }}
            viewBox="0 0 400 20"
            preserveAspectRatio="none"
          >
            <path
              d="M0 10 Q 50 0 100 10 T 200 10 T 300 10 T 400 10 V20 H0 Z"
              fill="var(--color-su)"
              opacity={0.9}
            />
          </svg>
          <div className="absolute inset-x-0 top-3 bottom-0" style={{ backgroundColor: "var(--color-su)", opacity: 0.75 }} />
        </div>
      </motion.div>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold tabular-nums-tight text-white drop-shadow-sm">{Math.round(pct)}%</span>
      </div>

      <style jsx>{`
        @keyframes mertos-wave {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
