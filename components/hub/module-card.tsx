import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ModuleDescriptor } from "@/lib/registry/modules";

export function ModuleCard({ module }: { module: ModuleDescriptor }) {
  return (
    <Link
      href={module.route}
      className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center justify-between">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `color-mix(in srgb, var(${module.accentVar}) 16%, transparent)` }}
        >
          <module.icon className="h-5 w-5" style={{ color: `var(${module.accentVar})` }} strokeWidth={2.2} />
        </span>
        <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
      </div>
      <div>
        <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">{module.name}</p>
        <p className="text-[12px] text-[var(--color-text-secondary)] line-clamp-2 mt-0.5">{module.description}</p>
      </div>
    </Link>
  );
}
