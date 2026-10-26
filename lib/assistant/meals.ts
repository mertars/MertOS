import { LEFTOVER_MAX_DAYS, MEAL_EXCLUDE_DAYS, QUICK_MEAL_MAX_MIN } from "./config";
import { addDays, daysBetween } from "./time";
import type { DayType, Meal, MealLogRow, MealType } from "./types";

// Kural tabanlı öğün önerisi — LLM yok. Kurallar (görev dosyası § 6):
// 1. Toplu pişirilmiş bir tariften kalan porsiyon varsa önce o önerilir.
// 2. Aynı tarif art arda iki gün gelmez; son 5 günde yenenler elenir.
// 3. Koşu günü hızlı tarif, yürüyüş günü daha uzun / toplu pişirme tarifi.
// 4. Seçim deterministik: aynı gün aynı öğün için hep aynı öneri.

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  kahvalti: "Kahvaltı",
  ogle: "Öğle",
  aksam: "Akşam",
};

export type MealSuggestion =
  | { kind: "kalan"; meal: Meal; remaining: number; cookedOn: string; reason: string }
  | { kind: "yeni"; meal: Meal; reason: string }
  | { kind: "yok"; reason: string };

export interface LeftoverInfo {
  meal: Meal;
  cookedOn: string;
  remaining: number;
}

/** Bugün itibarıyla hâlâ kalanı olan toplu pişirme tarifleri. */
export function findLeftovers(date: string, meals: Meal[], log: MealLogRow[]): LeftoverInfo[] {
  const byId = new Map(meals.map((m) => [m.id, m]));
  const result: LeftoverInfo[] = [];
  for (const meal of byId.values()) {
    if (meal.servings <= 1) continue;
    const cooks = log
      .filter((r) => r.mealId === meal.id && !r.isLeftover && r.date <= date)
      .sort((a, b) => (a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1));
    const lastCook = cooks.at(-1);
    if (!lastCook) continue;
    const age = daysBetween(lastCook.date, date);
    if (age < 0 || age > LEFTOVER_MAX_DAYS) continue;
    const eatenLeftovers = log.filter(
      (r) => r.mealId === meal.id && r.isLeftover && (r.date > lastCook.date || (r.date === lastCook.date && r.id > lastCook.id)),
    ).length;
    const remaining = meal.servings - 1 - eatenLeftovers;
    if (remaining > 0) result.push({ meal, cookedOn: lastCook.date, remaining });
  }
  return result.sort((a, b) => (a.cookedOn < b.cookedOn ? -1 : a.cookedOn > b.cookedOn ? 1 : a.meal.id.localeCompare(b.meal.id)));
}

/** Basit, deterministik string hash (FNV-1a) — günlük çeşitlilik için. */
export function stableHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function fitsDayType(meal: Meal, dayType: DayType): boolean {
  return meal.dayTypes.length === 0 || meal.dayTypes.includes(dayType);
}

export function suggestMeal(params: {
  date: string;
  dayType: DayType;
  mealType: MealType;
  meals: Meal[];
  log: MealLogRow[];
  /** Aynı gün başka öğünlere zaten önerilen tarifler — aynı gün iki kez aynı yemek gelmesin. */
  alreadySuggested?: string[];
}): MealSuggestion {
  const { date, dayType, mealType, meals, log } = params;
  const taken = new Set(params.alreadySuggested ?? []);
  const forType = meals.filter((m) => m.mealTypes.includes(mealType));
  if (forType.length === 0) {
    return { kind: "yok", reason: "Bu öğün için kayıtlı tarif yok." };
  }

  // 1) Kalan porsiyon
  const leftover = findLeftovers(date, forType, log)[0];
  if (leftover) {
    return {
      kind: "kalan",
      meal: leftover.meal,
      remaining: leftover.remaining,
      cookedOn: leftover.cookedOn,
      reason: leftover.meal.reheat ? `Kalan porsiyon — ${leftover.meal.reheat} ile ısıt.` : "Kalan porsiyon.",
    };
  }

  // 2) Son günlerde yenenleri ele
  const yesterday = addDays(date, -1);
  const excludeFrom = addDays(date, -MEAL_EXCLUDE_DAYS);
  const recent = new Set(log.filter((r) => r.mealId && r.date >= excludeFrom && r.date <= date).map((r) => r.mealId!));
  const eatenYesterdayOrToday = new Set(log.filter((r) => r.mealId && r.date >= yesterday && r.date <= date).map((r) => r.mealId!));
  const repeatWanted = new Set(log.filter((r) => r.repeat && r.mealId).map((r) => r.mealId!));

  const base = forType.filter((m) => fitsDayType(m, dayType) && !taken.has(m.id));
  let pool = base.filter((m) => !recent.has(m.id));
  let relaxed = false;
  if (pool.length === 0) {
    // Tarif az ise 5 gün kuralını gevşet, ama dün/bugün yeneni asla tekrar önerme.
    pool = base.filter((m) => !eatenYesterdayOrToday.has(m.id));
    relaxed = true;
  }
  if (pool.length === 0) {
    return { kind: "yok", reason: "Uygun tarif kalmadı — son günlerde hepsi yendi." };
  }

  // 3) Gün tipine göre tercih
  let preferred: Meal[];
  let reason: string;
  if (dayType === "kosu") {
    const quick = pool.filter((m) => m.durationMin <= QUICK_MEAL_MAX_MIN);
    preferred = quick.length > 0 ? quick : pool;
    reason = quick.length > 0 ? "Koşu günü — hızlı tarif." : "Koşu günü (hızlı tarif yok).";
  } else {
    const batch = pool.filter((m) => m.servings > 1);
    preferred = mealType !== "kahvalti" && batch.length > 0 ? batch : pool;
    reason = preferred === batch ? "Yürüyüş günü — toplu pişirme için iyi gün." : "Yürüyüş günü — vaktin daha bol.";
  }

  // "Tekrar yap" işaretlenenler öne
  const wanted = preferred.filter((m) => repeatWanted.has(m.id));
  if (wanted.length > 0) {
    preferred = wanted;
    reason += " Tekrar yapmak istediğin bir tarif.";
  }
  if (relaxed) reason += " (Tarif az olduğu için son 5 gün kuralı gevşetildi.)";

  const sorted = [...preferred].sort((a, b) => a.id.localeCompare(b.id));
  const pick = sorted[stableHash(`${date}:${mealType}`) % sorted.length];
  return { kind: "yeni", meal: pick, reason };
}

/**
 * Günün üç öğünü için öneri. Aynı yeni tarif aynı gün iki öğüne önerilmez;
 * ama öğlen önerilen bir toplu pişirme tarifinin kalanı akşama önerilebilir
 * (planlama sırasında sanal bir "pişirildi/yendi" kaydı eklenir, veritabanına yazılmaz).
 */
export function suggestDayMeals(params: {
  date: string;
  dayType: DayType;
  meals: Meal[];
  log: MealLogRow[];
  /** Bugün zaten kaydı olan öğünler — bunlar için öneri üretilmez. */
  skip?: MealType[];
}): Record<MealType, MealSuggestion> {
  const taken: string[] = [];
  const virtualLog = [...params.log];
  let virtualId = Math.max(0, ...params.log.map((r) => r.id)) + 1;
  const out = {} as Record<MealType, MealSuggestion>;
  for (const mealType of ["kahvalti", "ogle", "aksam"] as const) {
    if (params.skip?.includes(mealType)) {
      out[mealType] = { kind: "yok", reason: "Bu öğün kaydedildi." };
      continue;
    }
    const s = suggestMeal({ ...params, log: virtualLog, mealType, alreadySuggested: taken });
    out[mealType] = s;
    if (s.kind === "yok") continue;
    taken.push(s.meal.id);
    virtualLog.push({
      id: virtualId++,
      date: params.date,
      mealType,
      mealId: s.meal.id,
      mealName: s.meal.name,
      isLeftover: s.kind === "kalan",
      rating: null,
      note: null,
      repeat: false,
      createdAt: "",
    });
  }
  return out;
}
