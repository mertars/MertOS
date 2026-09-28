"use client";

import { endOfWeek, startOfMonth, endOfMonth, startOfWeek } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { getWaterTotalForDay } from "@/lib/db/repo/water";
import { getCigaretteEntriesForDay } from "@/lib/db/repo/cigarette";
import { getWorkoutsInRange } from "@/lib/db/repo/workouts";
import { getMoodEntriesForDate } from "@/lib/db/repo/zihin";
import { getAllOpenTasks } from "@/lib/db/repo/uretkenlik";
import { getTransactionsInRange, summarize } from "@/lib/db/repo/finans";
import { getActiveHabits, getAllHabitLogsForDate } from "@/lib/db/repo/aliskanlik";
import { getScheduleBlocksForDate } from "@/lib/db/repo/takvim";
import { useProfile, useCigaretteSettings } from "@/lib/hooks/db-hooks";
import { computeWaterGoalMl } from "@/lib/scoring/engine";

/** Hub kartında "büyük metrik" satırı — her hub için o hub'ın en anlamlı günlük özetini gösterir. */
export function HubQuickMetric({ hubId }: { hubId: string }) {
  if (hubId === "beden") return <BedenMetric />;
  if (hubId === "beslenme") return <BeslenmeMetric />;
  if (hubId === "sigara") return <SigaraMetric />;
  if (hubId === "zihin") return <ZihinMetric />;
  if (hubId === "uretkenlik") return <UretkenlikMetric />;
  if (hubId === "finans") return <FinansMetric />;
  if (hubId === "aliskanlik") return <AliskanlikMetric />;
  if (hubId === "takvim") return <TakvimMetric />;
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

function ZihinMetric() {
  const count = useLiveQuery(() => getMoodEntriesForDate(), []);
  return (
    <p className="text-[13px] text-[var(--color-text-secondary)]">
      {count && count.length > 0 ? "Bugün ruh hali kaydedildi" : "Bugün henüz kayıt yok"}
    </p>
  );
}

function UretkenlikMetric() {
  const openTasks = useLiveQuery(() => getAllOpenTasks(), []);
  return (
    <p className="text-[13px] text-[var(--color-text-secondary)]">
      <span className="font-semibold text-[var(--color-text-primary)]">{openTasks?.length ?? "–"}</span> açık görev
    </p>
  );
}

function FinansMetric() {
  const net = useLiveQuery(async () => {
    const now = new Date();
    const rows = await getTransactionsInRange(startOfMonth(now), endOfMonth(now));
    return summarize(rows).net;
  }, []);
  return (
    <p className="text-[13px] text-[var(--color-text-secondary)]">
      Bu ay net <span className="font-semibold text-[var(--color-text-primary)]">{net != null ? `${net >= 0 ? "+" : ""}${Math.round(net)} TL` : "–"}</span>
    </p>
  );
}

function AliskanlikMetric() {
  const data = useLiveQuery(async () => {
    const [habits, logs] = await Promise.all([getActiveHabits(), getAllHabitLogsForDate()]);
    const doneToday = logs.filter((l) => l.done).length;
    return { total: habits.length, doneToday };
  }, []);
  return (
    <p className="text-[13px] text-[var(--color-text-secondary)]">
      Bugün <span className="font-semibold text-[var(--color-text-primary)]">{data?.doneToday ?? 0}/{data?.total ?? 0}</span> alışkanlık
    </p>
  );
}

function TakvimMetric() {
  const blocks = useLiveQuery(() => getScheduleBlocksForDate(), []);
  return (
    <p className="text-[13px] text-[var(--color-text-secondary)]">
      Bugün <span className="font-semibold text-[var(--color-text-primary)]">{blocks?.length ?? 0}</span> blok planlı
    </p>
  );
}
