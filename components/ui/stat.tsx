import { cn } from "@/lib/utils";

export function StatNumber({
  value,
  unit,
  className,
  size = "lg",
}: {
  value: React.ReactNode;
  unit?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-6xl",
  } as const;
  return (
    <span className={cn("tabular-nums-tight font-bold text-[var(--color-text-primary)]", sizes[size], className)}>
      {value}
      {unit && <span className="text-[0.4em] font-semibold text-[var(--color-text-secondary)] ml-1">{unit}</span>}
    </span>
  );
}

export function ProgressBar({ value, colorVar, className }: { value: number; colorVar: string; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-2.5 w-full rounded-full bg-white/8 overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${clamped}%`, backgroundColor: `var(${colorVar})` }}
      />
    </div>
  );
}
