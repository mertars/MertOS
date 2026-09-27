import Dexie, { type EntityTable } from "dexie";
import type {
  AppSettings,
  CigaretteEntry,
  CigaretteSettings,
  Expense,
  PersonalRecord,
  Profile,
  Program,
  ProgramProgress,
  QuickAddUsage,
  StrengthSet,
  WaterEntry,
  Workout,
} from "./types";

/**
 * MertOS Dexie veritabanı.
 *
 * Versiyonlama kuralı: bir alanı asla yerinde silme/tipini değiştirme.
 * 2. aşamada yeni modül tabloları eklerken `this.version(2).stores({...})`
 * şeklinde yeni bir versiyon açılacak (bkz. CLAUDE.md § Veri Şeması).
 */
export class MertOSDB extends Dexie {
  profile!: EntityTable<Profile, "id">;
  settings!: EntityTable<AppSettings, "id">;

  workouts!: EntityTable<Workout, "id">;
  strengthSets!: EntityTable<StrengthSet, "id">;
  personalRecords!: EntityTable<PersonalRecord, "id">;
  programs!: EntityTable<Program, "id">;
  programProgress!: EntityTable<ProgramProgress, "id">;

  waterEntries!: EntityTable<WaterEntry, "id">;

  cigaretteEntries!: EntityTable<CigaretteEntry, "id">;
  cigaretteSettings!: EntityTable<CigaretteSettings, "id">;

  expenses!: EntityTable<Expense, "id">;
  quickAddUsage!: EntityTable<QuickAddUsage, "id">;

  constructor() {
    super("mertos");

    this.version(1).stores({
      profile: "id",
      settings: "id",

      workouts: "id, date, type, deletedAt",
      strengthSets: "id, workoutId, exerciseId",
      personalRecords: "id, category, date",
      programs: "id",
      programProgress: "id, programId",

      waterEntries: "id, at, deletedAt",

      cigaretteEntries: "id, at, deletedAt",
      cigaretteSettings: "id",

      expenses: "id, date, source, category",
      quickAddUsage: "id, actionKey",
    });
  }
}

export const db = new MertOSDB();
