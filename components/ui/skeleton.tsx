import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl bg-[linear-gradient(110deg,var(--color-card-raised)_8%,rgba(255,255,255,0.08)_18%,var(--color-card-raised)_33%)] bg-[length:200%_100%] animate-shimmer",
        className,
      )}
    />
  );
}
