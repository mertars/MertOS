import type { Client, Row } from "@libsql/client";
import { DEFAULT_SETTINGS, type AssistantSettings } from "@/lib/assistant/config";
import { buildDailyBrief, type DailyBrief } from "@/lib/assistant/daily";
import { addDays, weekStart } from "@/lib/assistant/time";
import type { Chore, Meal, MealLogRow, MealType, RoutineItem, RoutineLogRow, ScheduleItem } from "@/lib/assistant/types";
import { listTodos } from "./todo-repo";

// Asistan tablolarının okuma/yazma fonksiyonları. İstemci (Client) parametre
// olarak alınır — böylece testler yerel bir libSQL dosyasıyla çalışabilir.

const json = <T>(v: unknown, fallback: T): T => {
  if (typeof v !== "string") return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
};

// --- Ayarlar ---------------------------------------------------------------

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof AssistantSettings)[];

export async function getSettings(db: Client): Promise<AssistantSettings> {
  const rows = (await db.execute(`SELECT key, value FROM settings`)).rows;
  const out: AssistantSettings = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    const key = String(r.key) as keyof AssistantSettings;
    if (SETTING_KEYS.includes(key)) (out as unknown as Record<string, unknown>)[key] = json(r.value, out[key]);
  }
  return out;
}

export async function updateSettings(db: Client, patch: Partial<AssistantSettings>): Promise<AssistantSettings> {
  const now = new Date().toISOString();
  const entries = Object.entries(patch).filter(([k]) => SETTING_KEYS.includes(k as keyof AssistantSettings));
  if (entries.length > 0) {
    await db.batch(
      entries.map(([k, v]) => ({
        sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: [k, JSON.stringify(v), now],
      })),
      "write",
    );
  }
  return getSettings(db);
}

// --- Okuma -----------------------------------------------------------------

function toSchedule(r: Row): ScheduleItem {
  return {
    id: String(r.id),
    time: String(r.time),
    kind: String(r.kind) as ScheduleItem["kind"],
    dayType: String(r.day_type) as ScheduleItem["dayType"],
    title: String(r.title),
    detail: r.detail == null ? null : String(r.detail),
    routineItem: r.routine_item == null ? null : (String(r.routine_item) as RoutineItem),
    mealType: r.meal_type == null ? null : (String(r.meal_type) as MealType),
    sort: Number(r.sort),
  };
}

function toMeal(r: Row): Meal {
  return {
    id: String(r.id),
    name: String(r.name),
    mealTypes: json(r.meal_types, []),
    durationMin: Number(r.duration_min),
    difficulty: String(r.difficulty) as Meal["difficulty"],
    equipment: json(r.equipment, []),
    steps: json(r.steps, []),
    ingredients: json(r.ingredients, []),
    servings: Number(r.servings),
    reheat: r.reheat == null ? null : String(r.reheat),
    dayTypes: json(r.day_types, []),
    tags: json(r.tags, []),
  };
}

function toMealLog(r: Row): MealLogRow {
  return {
    id: Number(r.id),
    date: String(r.date),
    mealType: String(r.meal_type) as MealType,
    mealId: r.meal_id == null ? null : String(r.meal_id),
    mealName: String(r.meal_name),
    isLeftover: Number(r.is_leftover) === 1,
    rating: r.rating == null ? null : Number(r.rating),
    note: r.note == null ? null : String(r.note),
    repeat: Number(r.repeat) === 1,
    createdAt: String(r.created_at),
  };
}

export async function listSchedule(db: Client): Promise<ScheduleItem[]> {
  return (await db.execute(`SELECT * FROM schedule_items WHERE active = 1 ORDER BY time, sort`)).rows.map(toSchedule);
}

export async function listMeals(db: Client): Promise<Meal[]> {
  return (await db.execute(`SELECT * FROM meals WHERE active = 1 ORDER BY id`)).rows.map(toMeal);
}

export async function listChores(db: Client): Promise<Chore[]> {
  return (await db.execute(`SELECT * FROM chores WHERE active = 1 ORDER BY id`)).rows.map((r) => ({
    id: String(r.id),
    weekday: r.weekday == null ? null : Number(r.weekday),
    title: String(r.title),
    rotation: r.rotation == null ? null : json<string[]>(r.rotation, []),
  }));
}

export async function listMealLog(db: Client, from: string, to: string): Promise<MealLogRow[]> {
  return (
    await db.execute({
      sql: `SELECT * FROM meal_log WHERE deleted_at IS NULL AND date >= ? AND date <= ? ORDER BY date, id`,
      args: [from, to],
    })
  ).rows.map(toMealLog);
}

export async function listRoutineLog(db: Client, from: string, to: string): Promise<RoutineLogRow[]> {
  return (
    await db.execute({ sql: `SELECT * FROM routine_log WHERE date >= ? AND date <= ? ORDER BY date`, args: [from, to] })
  ).rows.map((r) => ({
    date: String(r.date),
    item: String(r.item) as RoutineItem,
    done: Number(r.done) === 1,
    updatedAt: String(r.updated_at),
  }));
}

// --- Yazma (yalnızca günlük "yapıldı" kayıtları) -----------------------------

export async function setRoutineDone(db: Client, date: string, item: RoutineItem, done: boolean, source = "ekran") {
  await db.execute({
    sql: `INSERT INTO routine_log (date, item, done, source, updated_at) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(date, item) DO UPDATE SET done = excluded.done, source = excluded.source, updated_at = excluded.updated_at`,
    args: [date, item, done ? 1 : 0, source, new Date().toISOString()],
  });
}

export async function addMealLog(
  db: Client,
  entry: { date: string; mealType: MealType; mealId: string | null; mealName: string; isLeftover: boolean; rating?: number | null; note?: string | null; repeat?: boolean },
  source = "ekran",
): Promise<number> {
  const res = await db.execute({
    sql: `INSERT INTO meal_log (date, meal_type, meal_id, meal_name, is_leftover, rating, note, repeat, source, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      entry.date,
      entry.mealType,
      entry.mealId,
      entry.mealName,
      entry.isLeftover ? 1 : 0,
      entry.rating ?? null,
      entry.note ?? null,
      entry.repeat ? 1 : 0,
      source,
      new Date().toISOString(),
    ],
  });
  return Number(res.lastInsertRowid);
}

export async function deleteMealLog(db: Client, id: number) {
  await db.execute({ sql: `UPDATE meal_log SET deleted_at = ? WHERE id = ?`, args: [new Date().toISOString(), id] });
}

// --- Günlük özet ---------------------------------------------------------------

/** Günlük özet — LLM'siz. Haftalık tutarlılık + kalan porsiyon + 5 gün kuralı için ~2 haftalık geçmişi okur. */
export async function getDailyBrief(db: Client, date: string, time: string): Promise<DailyBrief> {
  const from = [addDays(date, -14), weekStart(date)].sort()[0];
  const [settings, schedule, meals, chores, mealLog, routineLog, todos] = await Promise.all([
    getSettings(db),
    listSchedule(db),
    listMeals(db),
    listChores(db),
    listMealLog(db, from, date),
    listRoutineLog(db, from, date),
    listTodos(db, date, date),
  ]);
  return buildDailyBrief({ date, time, hitap: settings.hitap, schedule, meals, chores, mealLog, routineLog, todos });
}
