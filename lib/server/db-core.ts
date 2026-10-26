import type { Client } from "@libsql/client";
import { DEFAULT_CHORES, DEFAULT_SCHEDULE, RECIPES } from "@/data/assistant/defaults";
import { stableHash } from "@/lib/assistant/meals";
import { FTS_STATEMENTS, MIGRATIONS } from "./schema";

// Veritabanı hazırlama (migration + varsayılan veriler). `server-only` içermez
// ki Vitest doğrudan yerel bir libSQL dosyasıyla test edebilsin; ortam
// değişkenlerini okuyan sarmalayıcı lib/server/db.ts'te.

export interface PrepareResult {
  version: number;
  ftsAvailable: boolean;
}

export async function prepareDatabase(client: Client): Promise<PrepareResult> {
  await client.execute(`CREATE TABLE IF NOT EXISTS schema_meta (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL)`);
  const row = (await client.execute(`SELECT version FROM schema_meta WHERE id = 1`)).rows[0];
  let version = row ? Number(row.version) : 0;

  for (let i = version; i < MIGRATIONS.length; i++) {
    await client.batch(
      [...MIGRATIONS[i], { sql: `INSERT INTO schema_meta (id, version) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET version = excluded.version`, args: [i + 1] }],
      "write",
    );
    version = i + 1;
  }

  let ftsAvailable = true;
  try {
    for (const sql of FTS_STATEMENTS) await client.execute(sql);
  } catch (e) {
    ftsAvailable = false;
    console.warn("[mertos] FTS5 oluşturulamadı, LIKE aramasına düşülecek:", e);
  }

  await seedDefaults(client);
  await syncRecipes(client);
  return { version, ftsAvailable };
}

/** Program ve temizlik tablosu boşsa varsayılanları yazar. Dolu tabloya dokunmaz. */
async function seedDefaults(client: Client) {
  const scheduleCount = Number((await client.execute(`SELECT COUNT(*) AS n FROM schedule_items`)).rows[0].n);
  if (scheduleCount === 0) {
    await client.batch(
      DEFAULT_SCHEDULE.map((s) => ({
        sql: `INSERT OR IGNORE INTO schedule_items (id, time, kind, day_type, title, detail, routine_item, meal_type, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [s.id, s.time, s.kind, s.dayType, s.title, s.detail, s.routineItem, s.mealType, s.sort],
      })),
      "write",
    );
  }
  const choreCount = Number((await client.execute(`SELECT COUNT(*) AS n FROM chores`)).rows[0].n);
  if (choreCount === 0) {
    await client.batch(
      DEFAULT_CHORES.map((c) => ({
        sql: `INSERT OR IGNORE INTO chores (id, weekday, title, rotation) VALUES (?, ?, ?, ?)`,
        args: [c.id, c.weekday, c.title, c.rotation ? JSON.stringify(c.rotation) : null],
      })),
      "write",
    );
  }
}

/**
 * `data/assistant/defaults.ts` içindeki tarif listesini `meals` tablosuna
 * yansıtır. Tarifler sohbetle değişmez; tek kaynak koddaki liste. Listenin
 * içeriği değişmediyse (hash aynı) hiçbir şey yazılmaz.
 */
async function syncRecipes(client: Client) {
  const payload = JSON.stringify(RECIPES);
  const hash = String(stableHash(payload));
  const current = (await client.execute({ sql: `SELECT value FROM settings WHERE key = '_recipes_hash'`, args: [] })).rows[0];
  if (current && current.value === hash) return;

  const now = new Date().toISOString();
  const ids = RECIPES.map((r) => r.id);
  await client.batch(
    [
      ...RECIPES.map((m) => ({
        sql: `INSERT INTO meals (id, name, meal_types, duration_min, difficulty, equipment, steps, ingredients, servings, reheat, day_types, tags, active, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
              ON CONFLICT(id) DO UPDATE SET name = excluded.name, meal_types = excluded.meal_types, duration_min = excluded.duration_min,
                difficulty = excluded.difficulty, equipment = excluded.equipment, steps = excluded.steps, ingredients = excluded.ingredients,
                servings = excluded.servings, reheat = excluded.reheat, day_types = excluded.day_types, tags = excluded.tags, active = 1,
                updated_at = excluded.updated_at`,
        args: [
          m.id,
          m.name,
          JSON.stringify(m.mealTypes),
          m.durationMin,
          m.difficulty,
          JSON.stringify(m.equipment),
          JSON.stringify(m.steps),
          JSON.stringify(m.ingredients),
          m.servings,
          m.reheat,
          JSON.stringify(m.dayTypes),
          JSON.stringify(m.tags),
          now,
        ],
      })),
      // Listeden çıkarılan tarif silinmez (meal_log ona bağlı olabilir), pasife alınır.
      ids.length > 0
        ? { sql: `UPDATE meals SET active = 0 WHERE id NOT IN (${ids.map(() => "?").join(",")})`, args: ids }
        : { sql: `UPDATE meals SET active = 0`, args: [] },
      {
        sql: `INSERT INTO settings (key, value, updated_at) VALUES ('_recipes_hash', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: [hash, now],
      },
    ],
    "write",
  );
}

