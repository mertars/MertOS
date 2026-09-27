import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-10 px-6 text-center", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-[var(--color-text-secondary)]">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</p>
        {description && <p className="text-[13px] text-[var(--color-text-secondary)] max-w-[26ch]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
