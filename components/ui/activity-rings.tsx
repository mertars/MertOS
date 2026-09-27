"use client";

import { motion, useReducedMotion } from "framer-motion";

export interface RingSpec {
  key: string;
  value: number; // 0-100
  colorVar: string; // örn "--color-hareket"
  label?: string;
}

interface ActivityRingsProps {
  rings: RingSpec[];
  size?: number;
  strokeWidth?: number;
  gap?: number;
  children?: React.ReactNode;
  className?: string;
}

/** Apple Fitness tarzı iç içe aktivite halkaları. */
export function ActivityRings({ rings, size = 200, strokeWidth = 16, gap = 7, children, className }: ActivityRingsProps) {
  const reduceMotion = useReducedMotion();
  const center = size / 2;

  return (
    <div className={className} style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {rings.map((ring, i) => {
          const radius = center - strokeWidth / 2 - i * (strokeWidth + gap);
          const circumference = 2 * Math.PI * radius;
          const clamped = Math.min(100, Math.max(0, ring.value));
          const offset = circumference * (1 - clamped / 100);
          return (
            <g key={ring.key}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="var(--color-border-strong)"
                strokeWidth={strokeWidth}
                opacity={0.35}
              />
              <motion.circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={`var(${ring.colorVar})`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: reduceMotion ? offset : offset }}
                transition={{ duration: reduceMotion ? 0 : 1.1, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
                style={{ filter: clamped >= 100 ? `drop-shadow(0 0 6px var(${ring.colorVar}))` : undefined }}
              />
            </g>
          );
        })}
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}
