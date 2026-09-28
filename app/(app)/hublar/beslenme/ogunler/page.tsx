"use client";

import { Suspense, useState } from "react";
import { Plus, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { AutoOpenFromQuery } from "@/components/shell/auto-open-from-query";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { MacroSummaryCard } from "@/components/modules/beslenme/macro-summary-card";
import { TemplatesRow } from "@/components/modules/beslenme/templates-row";
import { TodayMealsList } from "@/components/modules/beslenme/today-meals-list";
import { WeeklyMacroChart } from "@/components/modules/beslenme/weekly-macro-chart";
import { AddMealSheet } from "@/components/modules/beslenme/add-meal-sheet";
import { GoalsSheet } from "@/components/modules/beslenme/goals-sheet";

type Tab = "bugun" | "istatistik";

export default function OgunlerPage() {
  const [tab, setTab] = useState<Tab>("bugun");
  const [addOpen, setAddOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="Beslenme"
        title="Öğünler"
        right={
          <Button size="icon" variant="secondary" onClick={() => setGoalsOpen(true)} aria-label="Hedefler">
            <Settings2 className="h-4 w-4" />
          </Button>
        }
      />
      <Suspense fallback={null}>
        <AutoOpenFromQuery targetPath="/hublar/beslenme/ogunler" onOpen={() => setAddOpen(true)} />
      </Suspense>
      <div className="px-5 mt-2 space-y-4 pb-4">
        <Segmented
          options={[
            { value: "bugun", label: "Bugün" },
            { value: "istatistik", label: "İstatistik" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "bugun" ? (
          <>
            <MacroSummaryCard />
            <Button variant="accent" accentVar="--color-beslenme" className="w-full" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Öğün Ekle
            </Button>
            <TemplatesRow />
            <TodayMealsList />
          </>
        ) : (
          <WeeklyMacroChart />
        )}
      </div>

      <AddMealSheet open={addOpen} onOpenChange={setAddOpen} />
      <GoalsSheet open={goalsOpen} onOpenChange={setGoalsOpen} />
    </>
  );
}
