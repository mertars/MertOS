"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { subDays } from "date-fns";
import { getWaterTotalForDay } from "@/lib/db/repo/water";
import { getCigaretteEntriesForDay } from "@/lib/db/repo/cigarette";
import { getWorkoutsForDate } from "@/lib/db/repo/workouts";
import { getCigaretteSettings, getProfile } from "@/lib/db";
import { computeCigaretteLimit, computeWaterGoalMl } from "@/lib/scoring/engine";
import { getScheduledDayForDate } from "@/lib/programs/engine";
import { useActiveProgram, useProgramProgress } from "@/lib/hooks/db-hooks";

const SCAN_DAYS = 60;

async function scanBackward(check: (date: Date) => Promise<boolean>): Promise<number> {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i <= SCAN_DAYS; i++) {
    const d = subDays(today, i);
    if (await check(d)) streak++;
    else break;
  }
  return streak;
}

export interface ModuleStreaks {
  su: number;
  sigara: number;
  antrenman: number;
}

/** Modül bazlı seriler: su hedefi, sigara limiti, antrenman programına uyum. */
export function useModuleStreaks(): ModuleStreaks | undefined {
  const program = useActiveProgram();
  const progress = useProgramProgress(program?.id);

  return useLiveQuery(async (): Promise<ModuleStreaks> => {
    const profile = await getProfile();
    const cigSettings = await getCigaretteSettings();

    const su = await scanBackward(async (d) => {
      const trained = (await getWorkoutsForDate(d)).length > 0;
      const goal = computeWaterGoalMl(profile.weightKg, trained);
      const ml = await getWaterTotalForDay(d);
      return ml >= goal;
    });

    const sigara = await scanBackward(async (d) => {
      const count = (await getCigaretteEntriesForDay(d)).length;
      const limit = computeCigaretteLimit(cigSettings, d);
      return cigSettings.quitMode ? count === 0 : count <= limit;
    });

    const antrenman = program
      ? await scanBackward(async (d) => {
          const scheduled = getScheduledDayForDate(program, progress, d);
          if (!scheduled) return true; // planlanmamış gün seriyi bozmaz
          return (await getWorkoutsForDate(d)).length > 0;
        })
      : 0;

    return { su, sigara, antrenman };
  }, [program?.id, progress?.updatedAt]);
}
