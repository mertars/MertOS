"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { ModuleCard } from "@/components/hub/module-card";
import { HubSummary } from "@/components/hub/hub-summary";
import { EmptyState } from "@/components/ui/empty-state";
import { getEnabledHubs, getHubById, getModulesForHub } from "@/lib/registry/modules";
import { useSettings } from "@/lib/hooks/db-hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Grid2x2 } from "lucide-react";

export default function HubDetailPage({ params }: { params: Promise<{ hub: string }> }) {
  const { hub: hubId } = use(params);
  const settings = useSettings();

  if (settings === undefined) {
    return (
      <div className="px-5 pt-safe mt-4 space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-[22px]" />
      </div>
    );
  }

  const hub = getHubById(hubId);
  const enabledHubs = getEnabledHubs(settings);
  const isEnabled = enabledHubs.some((h) => h.id === hubId);
  if (!hub || !isEnabled) notFound();

  const modules = getModulesForHub(hubId, settings);

  return (
    <>
      <PageHeader eyebrow="Hub" title={hub.name} />
      <div className="px-5 mt-2 space-y-5">
        <HubSummary hubId={hubId} />

        {modules.length === 0 ? (
          <EmptyState
            icon={<Grid2x2 className="h-6 w-6" />}
            title="Bu hub'da henüz modül yok"
            description="Yeni modüller yakında burada görünecek."
          />
        ) : (
          <div>
            <p className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-2 px-1">Modüller</p>
            <div className="grid grid-cols-2 gap-3">
              {modules.map((m) => (
                <ModuleCard key={m.id} module={m} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
