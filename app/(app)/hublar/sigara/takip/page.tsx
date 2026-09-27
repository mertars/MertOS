"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { Segmented } from "@/components/ui/segmented";
import { TodayTab } from "@/components/modules/sigara/today-tab";
import { PlanTab } from "@/components/modules/sigara/plan-tab";
import { AnalizTab } from "@/components/modules/sigara/analiz-tab";

type Tab = "bugun" | "plan" | "analiz";

export default function SigaraPage() {
  const [tab, setTab] = useState<Tab>("bugun");

  return (
    <>
      <PageHeader eyebrow="Sigara" title="Takip" />
      <div className="px-5 mt-2 space-y-4 pb-4">
        <Segmented
          options={[
            { value: "bugun", label: "Bugün" },
            { value: "plan", label: "Plan" },
            { value: "analiz", label: "Analiz" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "bugun" && <TodayTab />}
        {tab === "plan" && <PlanTab />}
        {tab === "analiz" && <AnalizTab />}
      </div>
    </>
  );
}
