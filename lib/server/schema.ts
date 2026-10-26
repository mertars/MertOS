// Turso (libSQL) şeması. Kural (Dexie'deki gibi): yayınlanmış bir migration
// adımını DEĞİŞTİRME — yeni tablo/alan için MIGRATIONS dizisine yeni bir adım ekle.
// Her adım bir kez çalışır; `schema_meta.version` hangi adıma kadar uygulandığını tutar.

export const MIGRATIONS: string[][] = [
  // v1 — Faz 1
  [
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS schedule_items (
      id TEXT PRIMARY KEY,
      time TEXT NOT NULL,
      kind TEXT NOT NULL,
      day_type TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT,
      routine_item TEXT,
      meal_type TEXT,
      sort INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS routine_log (
      date TEXT NOT NULL,
      item TEXT NOT NULL,
      done INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'ekran',
      updated_at TEXT NOT NULL,
      PRIMARY KEY (date, item)
    )`,
    `CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      meal_types TEXT NOT NULL,
      duration_min INTEGER NOT NULL,
      difficulty TEXT NOT NULL,
      equipment TEXT NOT NULL,
      steps TEXT NOT NULL,
      ingredients TEXT NOT NULL,
      servings INTEGER NOT NULL DEFAULT 1,
      reheat TEXT,
      day_types TEXT NOT NULL,
      tags TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS meal_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      meal_id TEXT,
      meal_name TEXT NOT NULL,
      is_leftover INTEGER NOT NULL DEFAULT 0,
      rating INTEGER,
      note TEXT,
      repeat INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'ekran',
      created_at TEXT NOT NULL,
      deleted_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS meal_log_date ON meal_log(date)`,
    `CREATE TABLE IF NOT EXISTS chores (
      id TEXT PRIMARY KEY,
      weekday INTEGER,
      title TEXT NOT NULL,
      rotation TEXT,
      active INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      source_conversation_id TEXT,
      confidence REAL NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'aktif',
      last_used_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      summary TEXT,
      summarized_upto INTEGER NOT NULL DEFAULT 0,
      memory_extracted_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'yazi',
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversation_id, id)`,
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'github',
      tracked INTEGER NOT NULL DEFAULT 0,
      added_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS project_state (
      project_id TEXT NOT NULL,
      source TEXT NOT NULL,
      data TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      PRIMARY KEY (project_id, source)
    )`,
    `CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      at INTEGER NOT NULL,
      ok INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS login_attempts_at ON login_attempts(at)`,
    `CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      size INTEGER NOT NULL,
      data TEXT NOT NULL
    )`,
  ],
  // v2 — Faz 2: mesajlara ek bilgi (ör. "Not aldım" satırının hafıza notu id'si)
  [`ALTER TABLE messages ADD COLUMN meta TEXT`],
  // v3 — ücretli Gemini anahtarı için günlük çağrı sayacı (maliyet sigortası)
  [`CREATE TABLE IF NOT EXISTS llm_usage (date TEXT PRIMARY KEY, calls INTEGER NOT NULL DEFAULT 0)`],
];

/**
 * Hafıza notları için FTS5 tam metin indeksi. Ayrı tutuluyor çünkü FTS5
 * desteği ortama göre değişebilir — oluşturulamazsa uygulama düz LIKE
 * aramasına düşer (bkz. lib/server/db.ts `ftsAvailable`).
 * `text_norm`: Türkçe karakterleri sadeleştirilmiş metin (ı→i, ş→s …).
 */
export const FTS_STATEMENTS = [
  `CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(text_norm, tokenize = 'unicode61 remove_diacritics 2')`,
];

/** Yedeğe giren tablolar (giriş denemeleri ve yedeklerin kendisi hariç). */
export const BACKUP_TABLES = [
  "settings",
  "schedule_items",
  "routine_log",
  "meals",
  "meal_log",
  "chores",
  "memories",
  "conversations",
  "messages",
  "projects",
  "project_state",
] as const;
