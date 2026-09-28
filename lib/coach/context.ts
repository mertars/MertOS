import { getProfile, getCigaretteSettings, getNutritionSettings } from "@/lib/db";
import { getWaterEntriesInRange } from "@/lib/db/repo/water";
import { getCigaretteEntriesInRange } from "@/lib/db/repo/cigarette";
import { getWorkoutsInRange } from "@/lib/db/repo/workouts";
import { getSleepEntriesInRange } from "@/lib/db/repo/health";
import { getMealEntriesInRange } from "@/lib/db/repo/meals";
import { getMoodEntriesInRange, getAllJournalEntries, getAllGratitudeEntries } from "@/lib/db/repo/zihin";
import { getFocusSessionsInRange, getCompletedTasksInRange } from "@/lib/db/repo/uretkenlik";
import { getTransactionsInRange, summarize } from "@/lib/db/repo/finans";
import { getActiveHabits, getHabitLogsInRange } from "@/lib/db/repo/aliskanlik";
import { computeAge, computeBMR, computeCalorieGoal, computeMacroGoals, computeTDEE, sumMacros } from "@/lib/nutrition/tdee";
import { computeCigaretteLimit, computeWaterGoalMl } from "@/lib/scoring/engine";
import { dateKey } from "@/lib/db/repo/workouts";

function avg(vals: number[]): number | null {
  return vals.length > 0 ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null;
}

export interface CoachContext {
  isim: string;
  aralikGun: number;
  skor: { seri: number };
  antrenman: { tamamlananSeans: number };
  su: { gunlukOrtalamaMl: number; hedefMl: number };
  sigara: { gunlukOrtalama: number; limit: number; birakmaModu: boolean; harcamaTl: number };
  uyku: { ortalamaDakika: number | null; girisSayisi: number };
  beslenme: { ortalamaKcal: number | null; ortalamaProteinG: number | null; proteinHedefG: number };
  zihin: { ortalamaMod: number | null; ortalamaEnerji: number | null; ortalamaStres: number | null; gunlukSayisi: number; minnettarlikSayisi: number };
  uretkenlik: { tamamlananGorev: number; odakDakika: number };
  finans: { gelir: number; gider: number; net: number };
  aliskanlik: { aktifSayi: number; ortalamaTamamlanmaOrani: number | null };
}

/**
 * Yerel Dexie verisinden AI Koç'a gönderilecek KÜÇÜK, özetlenmiş bir bağlam
 * çıkarır — ham kayıtlar hiçbir zaman Anthropic API'ye gitmez.
 */
export async function buildCoachContext(rangeDays: number, streak: number): Promise<CoachContext> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (rangeDays - 1));
  start.setHours(0, 0, 0, 0);

  const [profile, cigSettings, nutritionSettings] = await Promise.all([getProfile(), getCigaretteSettings(), getNutritionSettings()]);

  const [waterEntries, cigEntries, workouts, sleepEntries, mealEntries, moodEntries, journalEntries, gratitudeEntries, focusSessions, completedTasks, transactions, habits] =
    await Promise.all([
      getWaterEntriesInRange(start, end),
      getCigaretteEntriesInRange(start, end),
      getWorkoutsInRange(start, end),
      getSleepEntriesInRange(start, end),
      getMealEntriesInRange(start, end),
      getMoodEntriesInRange(start, end),
      getAllJournalEntries(),
      getAllGratitudeEntries(),
      getFocusSessionsInRange(start, end),
      getCompletedTasksInRange(start, end),
      getTransactionsInRange(start, end),
      getActiveHabits(),
    ]);

  const habitLogCounts = await Promise.all(habits.map((h) => getHabitLogsInRange(h.id, start, end)));
  const habitCompletionRates = habits.map((_, i) => habitLogCounts[i].length / rangeDays);

  const proteinGoal = computeMacroGoals({
    weightKg: profile.weightKg ?? 75,
    calorieGoal: computeCalorieGoal(
      computeTDEE(computeBMR(profile.weightKg ?? 75, profile.heightCm ?? 175, computeAge(profile.birthDate) ?? 30, profile.sex), nutritionSettings.activityLevel),
      nutritionSettings.mode,
    ),
    proteinGPerKg: nutritionSettings.proteinGPerKg,
    isTrainingDay: false,
    carbBoostOnTrainingDayPct: nutritionSettings.carbBoostOnTrainingDayPct,
  }).proteinG;

  const macroTotals = sumMacros(mealEntries.flatMap((e) => e.items.map((i) => i.macro)));
  const startKey = dateKey(start);
  const endKey = dateKey(end);
  const { gelir, gider, net } = summarize(transactions);
  const sigaraSpend = transactions.filter((t) => t.source === "sigara").reduce((s, t) => s + t.amount, 0);

  return {
    isim: profile.name || "Mert",
    aralikGun: rangeDays,
    skor: { seri: streak },
    antrenman: { tamamlananSeans: workouts.length },
    su: {
      gunlukOrtalamaMl: Math.round(waterEntries.reduce((s, e) => s + e.amountMl, 0) / rangeDays),
      hedefMl: computeWaterGoalMl(profile.weightKg, false),
    },
    sigara: {
      gunlukOrtalama: Math.round((cigEntries.length / rangeDays) * 10) / 10,
      limit: computeCigaretteLimit(cigSettings, end),
      birakmaModu: cigSettings.quitMode,
      harcamaTl: Math.round(sigaraSpend),
    },
    uyku: { ortalamaDakika: avg(sleepEntries.map((s) => s.durationMin)), girisSayisi: sleepEntries.length },
    beslenme: {
      ortalamaKcal: mealEntries.length > 0 ? Math.round(macroTotals.kcal / rangeDays) : null,
      ortalamaProteinG: mealEntries.length > 0 ? Math.round(macroTotals.proteinG / rangeDays) : null,
      proteinHedefG: proteinGoal,
    },
    zihin: {
      ortalamaMod: avg(moodEntries.map((m) => m.mood)),
      ortalamaEnerji: avg(moodEntries.map((m) => m.energy)),
      ortalamaStres: avg(moodEntries.map((m) => m.stress)),
      gunlukSayisi: journalEntries.filter((j) => j.date >= startKey && j.date <= endKey).length,
      minnettarlikSayisi: gratitudeEntries.filter((g) => g.date >= startKey && g.date <= endKey).length,
    },
    uretkenlik: {
      tamamlananGorev: completedTasks.length,
      odakDakika: Math.round(focusSessions.reduce((s, f) => s + f.actualDurationSec, 0) / 60),
    },
    finans: { gelir: Math.round(gelir), gider: Math.round(gider), net: Math.round(net) },
    aliskanlik: {
      aktifSayi: habits.length,
      ortalamaTamamlanmaOrani: habitCompletionRates.length > 0 ? Math.round(avg(habitCompletionRates)! * 100) / 100 : null,
    },
  };
}
