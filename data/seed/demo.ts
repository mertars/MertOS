import { subDays, setHours, setMinutes } from "date-fns";
import { addWaterEntry } from "@/lib/db/repo/water";
import { addCigaretteEntry, updateCigaretteSettings } from "@/lib/db/repo/cigarette";
import { addStrengthSets, addWorkout, dateKey, getWorkout } from "@/lib/db/repo/workouts";
import { checkRunningRecords, checkStrengthRecords } from "@/lib/programs/records";
import { db, getProfile } from "@/lib/db";
import type { CigaretteTrigger } from "@/lib/db/types";
import { randInt } from "@/lib/utils";

const TRIGGERS: CigaretteTrigger[] = ["kahve", "stres", "yemek_sonrasi", "sosyal", "can_sikintisi", "is"];

function atHour(day: Date, hour: number, minute = 0) {
  return setMinutes(setHours(day, hour), minute);
}

/** Gerçekçi görünen ~3 haftalık demo veri üretir. Mevcut verinin üzerine EKLENİR (silmez). */
export async function loadDemoData() {
  const now = new Date();

  await db.profile.update("me", { heightCm: 181, weightKg: 84, weightGoalKg: 78 });

  // --- Su: son 14 gün ---
  for (let d = 13; d >= 0; d--) {
    const day = subDays(now, d);
    const entryCount = randInt(4, 7);
    for (let i = 0; i < entryCount; i++) {
      const hour = 7 + Math.round((i / entryCount) * 14);
      await addWaterEntry([200, 250, 330, 500][randInt(0, 3)], atHour(day, hour, randInt(0, 59)));
    }
  }

  // --- Sigara: son 21 gün, azalan trend + azaltma planı ---
  await updateCigaretteSettings({ baselineAvgPerDay: 11 });
  for (let d = 20; d >= 0; d--) {
    const day = subDays(now, d);
    const targetAvg = Math.max(3, Math.round(11 - (20 - d) * 0.35));
    const count = Math.max(0, targetAvg + randInt(-2, 2));
    for (let i = 0; i < count; i++) {
      const hour = randInt(8, 23);
      await addCigaretteEntry(TRIGGERS[randInt(0, TRIGGERS.length - 1)], atHour(day, hour, randInt(0, 59)));
    }
  }
  await updateCigaretteSettings({
    reduction: {
      startDate: subDays(now, 20).toISOString(),
      startAvgPerDay: 11,
      targetAvgPerDay: 4,
      targetDate: subDays(now, -14).toISOString(),
      weeklyStepPct: 15,
    },
  });

  // --- Antrenman: son 3 hafta, Salı/Perşembe/Cumartesi + bir halısaha ---
  const profile = await getProfile();
  let basePaceMinPerKm = 7.6;

  for (let d = 20; d >= 0; d--) {
    const day = subDays(now, d);
    const dow = day.getDay();
    if (![2, 4, 6].includes(dow)) continue;
    if (Math.random() < 0.12) continue; // bazen atlanmış gün gerçekçi durur

    const weeksAgo = Math.floor(d / 7);
    const progressFactor = (3 - weeksAgo) * 0.06;
    basePaceMinPerKm = Math.max(6.2, 7.6 - progressFactor * 4);

    if (dow === 2) {
      // Gün A — Kolay Koşu
      const distanceKm = 4.5 + randInt(0, 15) / 10;
      const durationMin = distanceKm * (basePaceMinPerKm + 0.6);
      const workoutId = await addWorkout({
        type: "kosu",
        date: dateKey(day),
        startedAt: atHour(day, 6, 35).toISOString(),
        endedAt: atHour(day, 6, 35 + Math.round(durationMin)).toISOString(),
        durationSec: Math.round(durationMin * 60),
        distanceM: Math.round(distanceKm * 1000),
        avgHr: randInt(138, 152),
        maxHr: randInt(155, 168),
        vo2max: 38 + Math.round((3 - weeksAgo) * 0.8),
        feel: (randInt(2, 4) as 1 | 2 | 3 | 4 | 5),
        source: "manuel",
      });
      const saved = await getWorkout(workoutId);
      if (saved) await checkRunningRecords(saved);
    } else if (dow === 4) {
      // Gün B — Interval
      await addWorkout({
        type: "interval",
        date: dateKey(day),
        startedAt: atHour(day, 6, 30).toISOString(),
        endedAt: atHour(day, 7, 5).toISOString(),
        durationSec: 35 * 60,
        avgHr: randInt(150, 165),
        maxHr: randInt(172, 185),
        feel: (randInt(3, 5) as 1 | 2 | 3 | 4 | 5),
        source: "manuel",
      });
    } else if (Math.random() < 0.75) {
      // Gün C — Kuvvet
      const workoutId = await addWorkout({
        type: "kuvvet",
        date: dateKey(day),
        startedAt: atHour(day, 6, 30).toISOString(),
        endedAt: atHour(day, 7, 5).toISOString(),
        durationSec: 35 * 60,
        feel: (randInt(3, 4) as 1 | 2 | 3 | 4 | 5),
        source: "manuel",
      });
      const saved = await getWorkout(workoutId);
      const exercises = [
        { id: "bulgar-split-squat", name: "Bulgarian Split Squat", weight: 12 },
        { id: "goblet-squat", name: "Goblet Squat", weight: 16 },
        { id: "kettlebell-swing", name: "Kettlebell Swing", weight: 20 },
      ];
      const rows = exercises.flatMap((ex, exi) =>
        Array.from({ length: 3 }, (_, i) => ({
          workoutId,
          exerciseId: ex.id,
          exerciseName: ex.name,
          setIndex: exi * 3 + i,
          weightKg: ex.weight + weeksAgo * -1 + i,
          reps: randInt(8, 14),
          rpe: randInt(6, 9),
        })),
      );
      const sets = await addStrengthSets(rows);
      if (saved) await checkStrengthRecords(saved, sets);
    } else {
      await addWorkout({
        type: "halisaha",
        date: dateKey(day),
        startedAt: atHour(day, 20, 0).toISOString(),
        endedAt: atHour(day, 21, 15).toISOString(),
        durationSec: 75 * 60,
        feel: (randInt(3, 5) as 1 | 2 | 3 | 4 | 5),
        notes: "Halısaha maçı",
        source: "manuel",
      });
    }
  }

  return { profileWeightKg: profile.weightKg };
}
