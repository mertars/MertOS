import { suggestDayMeals, MEAL_TYPE_LABELS, type MealSuggestion } from "./meals";
import type { StudyDay } from "./study";
import { addDays, daysBetween, isoWeekNumber, isoWeekday, weekdayName, weekStart } from "./time";
import type { Chore, DayType, Meal, MealLogRow, MealType, RoutineItem, RoutineLogRow, ScheduleItem, TodoItem } from "./types";

// Günlük motor — tamamen deterministik, LLM'siz. `getDailyBrief` (sunucu)
// veritabanından satırları okuyup `buildDailyBrief`'e verir. Görev dosyası § 5.

/** Pzt, Çar, Cum, Paz = koşu günü; Sal, Per, Cmt = yürüyüş günü. */
export function dayTypeFor(date: string): DayType {
  return [1, 3, 5, 7].includes(isoWeekday(date)) ? "kosu" : "yuruyus";
}

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  kosu: "Koşu günü",
  yuruyus: "Yürüyüş günü",
};

export const DAY_TYPE_PLAN: Record<DayType, string> = {
  kosu: "6,5 km Zone 2 hafif tempo koşu (nabız üst sınırı 155–160)",
  yuruyus: "4 km tempolu yürüyüş + 14 dk duvar oturuşu",
};

export const ROUTINE_LABELS: Record<RoutineItem, string> = {
  uyanis: "Uyanış",
  buzlu_su: "Buzlu suya yüz",
  hidrasyon: "Su içme",
  soguk_dus: "Soğuk duş",
  kosu: "Koşu",
  yuruyus: "Yürüyüş",
  wall_sit: "Duvar oturuşu",
  su: "Su hedefi",
  temizlik: "Temizlik",
};

export function scheduleForDay(schedule: ScheduleItem[], dayType: DayType): ScheduleItem[] {
  return schedule
    .filter((s) => s.dayType === "hepsi" || s.dayType === dayType)
    .sort((a, b) => (a.time === b.time ? a.sort - b.sort : a.time < b.time ? -1 : 1));
}

/** O gün işaretlenmesi beklenen rutin maddeleri (programdan türetilir). */
export function routineItemsForDay(schedule: ScheduleItem[], dayType: DayType): RoutineItem[] {
  return scheduleForDay(schedule, dayType)
    .map((s) => s.routineItem)
    .filter((x): x is RoutineItem => x !== null);
}

export interface TodayChore {
  id: string;
  title: string;
}

export function choresForDate(chores: Chore[], date: string): TodayChore[] {
  const weekday = isoWeekday(date);
  const week = isoWeekNumber(date);
  return chores
    .filter((c) => c.weekday === null || c.weekday === weekday)
    .map((c) => ({
      id: c.id,
      title: c.rotation && c.rotation.length > 0 ? `${c.title}: ${c.rotation[week % c.rotation.length]}` : c.title,
    }));
}

// ---------------------------------------------------------------------------
// Haftalık tutarlılık özeti (§ 16.3) — LLM yok.

export interface WeeklyConsistency {
  weekStart: string;
  daysElapsed: number;
  runs: { done: number; planned: number };
  walks: { done: number; planned: number };
  /** Rutin maddelerinin yüzde kaçı yapıldı (bugün dahil, geçmiş günler) */
  routinePct: number;
  routine: { done: number; expected: number };
  mealLogs: { count: number; expected: number };
}

/** Sağlık ekranı için gün gün geçmiş (LLM yok): günün sporu yapıldı mı, rutinin kaçı yapıldı. */
export interface DayHistory {
  date: string;
  dayType: DayType;
  sportDone: boolean;
  routineDone: number;
  routineTotal: number;
}

export function computeHistory(params: { to: string; days: number; schedule: ScheduleItem[]; routineLog: RoutineLogRow[] }): DayHistory[] {
  const doneSet = new Set(params.routineLog.filter((r) => r.done).map((r) => `${r.date}|${r.item}`));
  const out: DayHistory[] = [];
  for (let i = params.days - 1; i >= 0; i--) {
    const date = addDays(params.to, -i);
    const dayType = dayTypeFor(date);
    const items = routineItemsForDay(params.schedule, dayType);
    out.push({
      date,
      dayType,
      sportDone: doneSet.has(`${date}|${dayType === "kosu" ? "kosu" : "yuruyus"}`),
      routineDone: items.filter((it) => doneSet.has(`${date}|${it}`)).length,
      routineTotal: items.length,
    });
  }
  return out;
}

export function computeWeeklyConsistency(params: {
  date: string;
  schedule: ScheduleItem[];
  routineLog: RoutineLogRow[];
  mealLog: MealLogRow[];
}): WeeklyConsistency {
  const { date, schedule } = params;
  const start = weekStart(date);
  const daysElapsed = daysBetween(start, date) + 1;
  const doneSet = new Set(params.routineLog.filter((r) => r.done && r.date >= start && r.date <= date).map((r) => `${r.date}|${r.item}`));

  let runsPlanned = 0;
  let runsDone = 0;
  let walksPlanned = 0;
  let walksDone = 0;
  let expected = 0;
  let done = 0;
  for (let i = 0; i < daysElapsed; i++) {
    const d = addDays(start, i);
    const type = dayTypeFor(d);
    if (type === "kosu") {
      runsPlanned++;
      if (doneSet.has(`${d}|kosu`)) runsDone++;
    } else {
      walksPlanned++;
      if (doneSet.has(`${d}|yuruyus`)) walksDone++;
    }
    for (const item of routineItemsForDay(schedule, type)) {
      expected++;
      if (doneSet.has(`${d}|${item}`)) done++;
    }
  }

  const mealCount = params.mealLog.filter((r) => r.date >= start && r.date <= date).length;
  return {
    weekStart: start,
    daysElapsed,
    runs: { done: runsDone, planned: runsPlanned },
    walks: { done: walksDone, planned: walksPlanned },
    routinePct: expected === 0 ? 0 : Math.round((done / expected) * 100),
    routine: { done, expected },
    mealLogs: { count: mealCount, expected: daysElapsed * 3 },
  };
}

// ---------------------------------------------------------------------------
// Günlük özet

export interface BriefScheduleItem extends ScheduleItem {
  done: boolean | null;
}

export interface BriefMeal {
  mealType: MealType;
  label: string;
  logged: { id: number; name: string; rating: number | null; isLeftover: boolean } | null;
  suggestion: MealSuggestion;
}

export interface DailyBrief {
  date: string;
  time: string;
  weekdayName: string;
  hitap: string;
  dayType: DayType;
  dayTypeLabel: string;
  plan: string;
  schedule: BriefScheduleItem[];
  routine: { done: number; total: number };
  meals: BriefMeal[];
  chores: TodayChore[];
  choreDone: boolean;
  projects: { status: "bagli-degil" };
  /** Bugünün yapılacakları (tabloya v4'te eklendi — eski önbellekte olmayabilir) */
  todos: TodoItem[];
  /** Ders ve sınav (Bölüm 18; sunucu doldurur — eski önbellekte olmayabilir) */
  study?: StudyDay;
  decision: string;
  week: WeeklyConsistency;
  generatedAt: string;
}

export interface BriefInput {
  date: string;
  time: string;
  hitap: string;
  schedule: ScheduleItem[];
  routineLog: RoutineLogRow[];
  meals: Meal[];
  mealLog: MealLogRow[];
  chores: Chore[];
  todos?: TodoItem[];
  now?: Date;
}

export function buildDailyBrief(input: BriefInput): DailyBrief {
  const { date, time, schedule } = input;
  const dayType = dayTypeFor(date);
  const todays = input.routineLog.filter((r) => r.date === date);
  const doneItems = new Set(todays.filter((r) => r.done).map((r) => r.item));

  const daySchedule: BriefScheduleItem[] = scheduleForDay(schedule, dayType).map((s) => ({
    ...s,
    done: s.routineItem ? doneItems.has(s.routineItem) : null,
  }));
  const routineItems = routineItemsForDay(schedule, dayType);

  const loggedToday = input.mealLog.filter((r) => r.date === date);
  const suggestions = suggestDayMeals({
    date,
    dayType,
    meals: input.meals,
    log: input.mealLog.filter((r) => r.date <= date),
    skip: [...new Set(loggedToday.map((r) => r.mealType))],
  });
  const meals: BriefMeal[] = (["kahvalti", "ogle", "aksam"] as const).map((mealType) => {
    const logged = loggedToday.filter((r) => r.mealType === mealType).at(-1);
    return {
      mealType,
      label: MEAL_TYPE_LABELS[mealType],
      logged: logged ? { id: logged.id, name: logged.mealName, rating: logged.rating, isLeftover: logged.isLeftover } : null,
      suggestion: suggestions[mealType],
    };
  });

  const chores = choresForDate(input.chores, date);
  const brief: DailyBrief = {
    date,
    time,
    weekdayName: weekdayName(isoWeekday(date)),
    hitap: input.hitap,
    dayType,
    dayTypeLabel: DAY_TYPE_LABELS[dayType],
    plan: DAY_TYPE_PLAN[dayType],
    schedule: daySchedule,
    routine: { done: routineItems.filter((i) => doneItems.has(i)).length, total: routineItems.length },
    meals,
    chores,
    choreDone: doneItems.has("temizlik"),
    projects: { status: "bagli-degil" },
    todos: (input.todos ?? []).filter((t) => t.date === date),
    decision: "",
    week: computeWeeklyConsistency({ date, schedule, routineLog: input.routineLog, mealLog: input.mealLog }),
    generatedAt: (input.now ?? new Date()).toISOString(),
  };
  brief.decision = buildDecision(brief);
  return brief;
}

/** Saate göre "şu an sıradaki öğün" — 10:30'a kadar kahvaltı, 16:00'ya kadar öğle, sonra akşam. */
export function currentMealType(time: string): MealType {
  if (time < "10:30") return "kahvalti";
  if (time < "16:00") return "ogle";
  return "aksam";
}

const lowerFirst = (s: string) => s.charAt(0).toLocaleLowerCase("tr-TR") + s.slice(1);

/**
 * "Günün kararı" (§ 16.1): tek cümle, kod üretir. Hitaptan sonra küçük harf, nokta
 * sonrası cümleler büyük harf: "Mert Bey, koşu günü: 6,5 km Zone 2 koşu. Öğle: kalan mercimek çorbası (ocak)."
 */
export function buildDecision(brief: DailyBrief): string {
  const sport = brief.dayType === "kosu" ? "kosu" : "yuruyus";
  const sportDone = brief.schedule.some((s) => s.routineItem === sport && s.done);
  const label = lowerFirst(brief.dayTypeLabel);
  const first = sportDone
    ? `${label}, ${brief.dayType === "kosu" ? "koşu" : "yürüyüş"} tamam`
    : `${label}: ${brief.dayType === "kosu" ? "6,5 km Zone 2 koşu" : "4 km yürüyüş + 14 dk duvar oturuşu"}`;

  let mealPart = "";
  const meal = brief.meals.find((m) => m.mealType === currentMealType(brief.time) && !m.logged) ?? brief.meals.find((m) => !m.logged);
  if (meal) {
    const s = meal.suggestion;
    if (s.kind === "kalan") mealPart = `${meal.label}: kalan ${lowerFirst(s.meal.name)}${s.meal.reheat ? ` (${s.meal.reheat})` : ""}`;
    else if (s.kind === "yeni") mealPart = `${meal.label}: ${lowerFirst(s.meal.name)}${s.meal.servings > 1 ? ` — toplu pişir, ${s.meal.servings} öğüne yeter` : ""}`;
  }

  return `${brief.hitap}, ${first}.${mealPart ? ` ${mealPart}.` : ""}`;
}
