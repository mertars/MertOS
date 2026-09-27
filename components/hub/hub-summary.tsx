"use client";

import { eachDayOfInterval, format, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { useLiveQuery } from "dexie-react-hooks";
import { Card } from "@/components/ui/card";
import { StatNumber } from "@/components/ui/stat";
import { Sparkbars, type SparkPoint } from "@/components/ui/sparkbars";
import { getWaterTotalForDay } from "@/lib/db/repo/water";
import { getCigaretteEntriesForDay } from "@/lib/db/repo/cigarette";
import { getWorkoutsForDate } from "@/lib/db/repo/workouts";
import { useCigaretteSettings, useProfile } from "@/lib/hooks/db-hooks";
import { computeWaterGoalMl } from "@/lib/scoring/engine";

const LAST_7_DAYS = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });

export function HubSummary({ hubId }: { hubId: string }) {
  if (hubId === "beden") return <BedenSummary />;
  if (hubId === "beslenme") return <BeslenmeSummary />;
  if (hubId === "sigara") return <SigaraSummary />;
  return null;
}

function BedenSummary() {
  const series = useLiveQuery(async () => {
    const points: SparkPoint[] = [];
    for (const day of LAST_7_DAYS) {
      const rows = await getWorkoutsForDate(day);
      const minutes = rows.reduce((s, w) => s + w.durationSec / 60, 0);
      points.push({ label: format(day, "EEEEEE", { locale: tr }), value: Math.round(minutes) });
    }
    return points;
  }, []);
  const weekTotal = series?.reduce((s, p) => s + p.value, 0) ?? 0;

  return (
    <Card>
      <p className="text-[13px] text-[var(--color-text-secondary)] mb-1">Bu hafta toplam</p>
      <StatNumber value={weekTotal} unit="dk antrenman" size="lg" />
      <div className="mt-4">{series && <Sparkbars data={series} colorVar="--color-hareket" />}</div>
    </Card>
  );
}

function BeslenmeSummary() {
  const profile = useProfile();
  const goal = computeWaterGoalMl(profile?.weightKg, false);
  const series = useLiveQuery(async () => {
    const points: SparkPoint[] = [];
    for (const day of LAST_7_DAYS) {
      const ml = await getWaterTotalForDay(day);
      points.push({ label: format(day, "EEEEEE", { locale: tr }), value: ml });
    }
    return points;
  }, []);
  const today = series?.[series.length - 1]?.value ?? 0;

  return (
    <Card>
      <p className="text-[13px] text-[var(--color-text-secondary)] mb-1">Bugün</p>
      <StatNumber value={today} unit={`/ ${goal} ml`} size="lg" />
      <div className="mt-4">{series && <Sparkbars data={series} colorVar="--color-su" />}</div>
    </Card>
  );
}

function SigaraSummary() {
  const settings = useCigaretteSettings();
  const series = useLiveQuery(async () => {
    const points: SparkPoint[] = [];
    for (const day of LAST_7_DAYS) {
      const rows = await getCigaretteEntriesForDay(day);
      points.push({ label: format(day, "EEEEEE", { locale: tr }), value: rows.length });
    }
    return points;
  }, []);
  const today = series?.[series.length - 1]?.value ?? 0;
  const weekTotal = series?.reduce((s, p) => s + p.value, 0) ?? 0;
  const estSaved = settings ? Math.round(((settings.baselineAvgPerDay * 7 - weekTotal) * (settings.packPrice / settings.cigsPerPack)) * 100) / 100 : 0;

  return (
    <Card>
      <p className="text-[13px] text-[var(--color-text-secondary)] mb-1">Bugün</p>
      <StatNumber value={today} unit="adet" size="lg" />
      {estSaved > 0 && (
        <p className="text-[12px] text-[var(--color-sigara-temiz)] mt-1 font-medium">
          Bu hafta ~{estSaved.toLocaleString("tr-TR")} TL biriktirdin
        </p>
      )}
      <div className="mt-4">{series && <Sparkbars data={series} colorVar="--color-sigara" />}</div>
    </Card>
  );
}
