"use client";

import { endOfWeek, startOfWeek } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { getWaterTotalForDay } from "@/lib/db/repo/water";
import { getCigaretteEntriesForDay } from "@/lib/db/repo/cigarette";
import { getWorkoutsInRange } from "@/lib/db/repo/workouts";
import { useProfile, useCigaretteSettings } from "@/lib/hooks/db-hooks";
import { computeWaterGoalMl } from "@/lib/scoring/engine";

/** Hub kartında "büyük metrik" satırı — 1. aşamada hub başına tek modül olduğu için doğrudan o modülün özetini gösterir. */
export function HubQuickMetric({ hubId }: { hubId: string }) {
  if (hubId === "beden") return <BedenMetric />;
  if (hubId === "beslenme") return <BeslenmeMetric />;
  if (hubId === "sigara") return <SigaraMetric />;
  return null;
}

function BedenMetric() {
  const count = useLiveQuery(async () => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    const rows = await getWorkoutsInRange(start, end);
    return rows.length;
  }, []);

  return (
    <p className="text-[13px] text-[var(--color-text-secondary)]">
      Bu hafta <span className="font-semibold text-[var(--color-text-primary)]">{count ?? "–"}</span> antrenman
    </p>
  );
}

function BeslenmeMetric() {
  const profile = useProfile();
  const totalMl = useLiveQuery(() => getWaterTotalForDay(), []);
  const goal = computeWaterGoalMl(profile?.weightKg, false);
  return (
    <p className="text-[13px] text-[var(--color-text-secondary)]">
      Bugün <span className="font-semibold text-[var(--color-text-primary)]">{totalMl ?? 0} ml</span> / {goal} ml su
    </p>
  );
}

function SigaraMetric() {
  const settings = useCigaretteSettings();
  const todayCount = useLiveQuery(async () => (await getCigaretteEntriesForDay()).length, []);
  const label = settings?.quitMode ? "Bırakma modu aktif" : `Bugün ${todayCount ?? 0} adet`;
  return <p className="text-[13px] text-[var(--color-text-secondary)]">{label}</p>;
}
