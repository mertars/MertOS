"use client";

import Link from "next/link";
import { getEnabledHubs } from "@/lib/registry/modules";
import { useSettings } from "@/lib/hooks/db-hooks";
import { HubQuickMetric } from "@/components/hub/hub-quick-metric";

export function HubMiniGrid() {
  const settings = useSettings();
  if (!settings) return null;
  const hubs = getEnabledHubs(settings);

  return (
    <div className="px-5">
      <p className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-2 px-1">Hub&apos;lar</p>
      <div className="grid grid-cols-2 gap-3">
        {hubs.map((hub) => (
          <Link
            key={hub.id}
            href={`/hublar/${hub.id}`}
            className="flex flex-col gap-2.5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 active:scale-[0.97] transition-transform"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: `color-mix(in srgb, var(${hub.accentVar}) 16%, transparent)` }}
            >
              <hub.icon className="h-4 w-4" style={{ color: `var(${hub.accentVar})` }} strokeWidth={2.2} />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">{hub.name}</p>
              <HubQuickMetric hubId={hub.id} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
