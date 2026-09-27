"use client";

import { useState } from "react";
import { addDays, format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { HealthTimeline } from "./health-timeline";
import { useCigaretteSettings } from "@/lib/hooks/db-hooks";
import { disableQuitMode, getLastCigaretteEntry, setQuitMode, setReductionPlan } from "@/lib/db/repo/cigarette";

export function PlanTab() {
  const settings = useCigaretteSettings();
  const last = useLiveQuery(() => getLastCigaretteEntry(), []);
  const [mode, setMode] = useState<"azaltma" | "birakma">("azaltma");
  const [targetAvg, setTargetAvg] = useState("0");
  const [targetWeeks, setTargetWeeks] = useState("8");

  if (!settings) return null;

  const since = settings.quitMode
    ? settings.quitDate
      ? new Date(settings.quitDate)
      : null
    : last
      ? new Date(last.at)
      : null;

  async function startReduction() {
    const start = new Date();
    await setReductionPlan({
      startDate: start.toISOString(),
      startAvgPerDay: settings!.baselineAvgPerDay,
      targetAvgPerDay: Math.max(0, Number(targetAvg) || 0),
      targetDate: addDays(start, (Number(targetWeeks) || 8) * 7).toISOString(),
      weeklyStepPct: 15,
    });
  }

  async function startQuit() {
    await setQuitMode(new Date());
  }

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">Durum</p>
        {settings.quitMode ? (
          <div className="space-y-3">
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              Bırakma modu aktif ·{" "}
              {settings.quitDate && format(new Date(settings.quitDate), "d MMMM yyyy")} tarihinden beri
            </p>
            <Button variant="secondary" onClick={disableQuitMode} className="w-full">
              Bırakma modunu kapat
            </Button>
          </div>
        ) : settings.reduction ? (
          <div className="space-y-3">
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              Azaltma planı aktif · hedef {settings.reduction.targetAvgPerDay}/gün ·{" "}
              {format(new Date(settings.reduction.targetDate), "d MMMM yyyy")} tarihine kadar
            </p>
            <Button variant="secondary" onClick={() => setReductionPlan(null)} className="w-full">
              Planı iptal et
            </Button>
          </div>
        ) : (
          <p className="text-[13px] text-[var(--color-text-secondary)]">Aktif bir plan yok. Aşağıdan bir tane başlat.</p>
        )}
      </Card>

      {!settings.quitMode && !settings.reduction && (
        <Card>
          <Segmented
            options={[
              { value: "azaltma", label: "Azaltma Planı" },
              { value: "birakma", label: "Bırakma Modu" },
            ]}
            value={mode}
            onChange={setMode}
            className="mb-4"
          />

          {mode === "azaltma" ? (
            <div className="space-y-3">
              <div>
                <Label>Hedef ortalama (adet/gün)</Label>
                <Input type="number" inputMode="numeric" value={targetAvg} onChange={(e) => setTargetAvg(e.target.value)} />
              </div>
              <div>
                <Label>Kaç haftada?</Label>
                <Input type="number" inputMode="numeric" value={targetWeeks} onChange={(e) => setTargetWeeks(e.target.value)} />
              </div>
              <p className="text-[11.5px] text-[var(--color-text-tertiary)]">
                Başlangıç ortalaman: {settings.baselineAvgPerDay}/gün. Limit haftalık olarak kademeli düşer.
              </p>
              <Button variant="accent" accentVar="--color-sigara-temiz" onClick={startReduction} className="w-full">
                Azaltma Planını Başlat
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                Bugünden itibaren sigarasız gün sayacı başlar. İstediğin an kapatabilirsin.
              </p>
              <Button variant="accent" accentVar="--color-sigara-temiz" onClick={startQuit} className="w-full">
                Bırakma Modunu Başlat
              </Button>
            </div>
          )}
        </Card>
      )}

      <HealthTimeline since={since} />
    </div>
  );
}
