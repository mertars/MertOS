import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { HubDescriptor } from "@/lib/registry/modules";
import { HubQuickMetric } from "./hub-quick-metric";

export function HubCard({ hub }: { hub: HubDescriptor }) {
  return (
    <Link
      href={`/hublar/${hub.id}`}
      className="flex items-center gap-3.5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 active:scale-[0.98] transition-transform"
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `color-mix(in srgb, var(${hub.accentVar}) 16%, transparent)` }}
      >
        <hub.icon className="h-6 w-6" style={{ color: `var(${hub.accentVar})` }} strokeWidth={2.2} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">{hub.name}</p>
        <HubQuickMetric hubId={hub.id} />
      </div>
      <ChevronRight className="h-5 w-5 text-[var(--color-text-tertiary)] shrink-0" />
    </Link>
  );
}
