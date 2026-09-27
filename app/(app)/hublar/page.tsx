"use client";

import { PageHeader } from "@/components/shell/page-header";
import { HubCard } from "@/components/hub/hub-card";
import { getEnabledHubs } from "@/lib/registry/modules";
import { useSettings } from "@/lib/hooks/db-hooks";
import { Skeleton } from "@/components/ui/skeleton";

export default function HublarPage() {
  const settings = useSettings();

  if (settings === undefined) {
    return (
      <div className="px-5 pt-safe mt-4 space-y-3">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-[22px]" />
        ))}
      </div>
    );
  }

  const hubs = getEnabledHubs(settings);

  return (
    <>
      <PageHeader eyebrow="MertOS" title="Hub'lar" />
      <div className="px-5 mt-2 space-y-3">
        {hubs.map((hub) => (
          <HubCard key={hub.id} hub={hub} />
        ))}
      </div>
    </>
  );
}
