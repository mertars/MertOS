import Dexie, { type EntityTable } from "dexie";
import type {
  ActivityDailyEntry,
  AppSettings,
  Book,
  BodyMetricEntry,
  BodyPhoto,
  CategoryBudget,
  CigaretteEntry,
  CigaretteSettings,
  CoachMessage,
  EarnedBadge,
  Expense,
  FocusSession,
  FoodItem,
  GratitudeEntry,
  Habit,
  HabitLog,
  HeartMetricEntry,
  HealthImportBatch,
  ImportantDate,
  JournalEntry,
  LongTermGoal,
  MealEntry,
  MealPhoto,
  MealTemplate,
  MoodEntry,
  NotificationSettings,
  NutritionSettings,
  PersonalRecord,
  Profile,
  Program,
  ProgramProgress,
  Project,
  QuickAddUsage,
  ReadingLog,
  Recipe,
  RoutineTemplate,
  SavingsContribution,
  SavingsGoal,
  ScheduleBlock,
  SleepEntry,
  StrengthSet,
  Subscription,
  Supplement,
  SupplementLog,
  Task,
  WaterEntry,
  Workout,
} from "./types";

/**
 * MertOS Dexie veritabanı.
 *
 * Versiyonlama kuralı: bir alanı asla yerinde silme/tipini değiştirme.
 * Yeni tablo eklerken `this.version(N).stores({...})` şeklinde SADECE yeni ya
 * da index'i değişen tabloları belirt — Dexie diğerlerini önceki versiyondan
 * otomatik taşır (bkz. CLAUDE.md § Veri Şeması).
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

  // --- 2. Aşama ---
  foods!: EntityTable<FoodItem, "id">;
  recipes!: EntityTable<Recipe, "id">;
  mealEntries!: EntityTable<MealEntry, "id">;
  mealTemplates!: EntityTable<MealTemplate, "id">;
  mealPhotos!: EntityTable<MealPhoto, "id">;
  nutritionSettings!: EntityTable<NutritionSettings, "id">;
  supplements!: EntityTable<Supplement, "id">;
  supplementLogs!: EntityTable<SupplementLog, "id">;

  sleepEntries!: EntityTable<SleepEntry, "id">;
  bodyMetrics!: EntityTable<BodyMetricEntry, "id">;
  bodyPhotos!: EntityTable<BodyPhoto, "id">;
  heartMetrics!: EntityTable<HeartMetricEntry, "id">;
  activityDaily!: EntityTable<ActivityDailyEntry, "id">;
  healthImportBatches!: EntityTable<HealthImportBatch, "id">;

  moodEntries!: EntityTable<MoodEntry, "id">;
  journalEntries!: EntityTable<JournalEntry, "id">;
  gratitudeEntries!: EntityTable<GratitudeEntry, "id">;
  books!: EntityTable<Book, "id">;
  readingLogs!: EntityTable<ReadingLog, "id">;

  tasks!: EntityTable<Task, "id">;
  projects!: EntityTable<Project, "id">;
  focusSessions!: EntityTable<FocusSession, "id">;

  categoryBudgets!: EntityTable<CategoryBudget, "id">;
  subscriptions!: EntityTable<Subscription, "id">;
  savingsGoals!: EntityTable<SavingsGoal, "id">;
  savingsContributions!: EntityTable<SavingsContribution, "id">;

  habits!: EntityTable<Habit, "id">;
  habitLogs!: EntityTable<HabitLog, "id">;
  longTermGoals!: EntityTable<LongTermGoal, "id">;

  scheduleBlocks!: EntityTable<ScheduleBlock, "id">;
  routineTemplates!: EntityTable<RoutineTemplate, "id">;
  importantDates!: EntityTable<ImportantDate, "id">;

  earnedBadges!: EntityTable<EarnedBadge, "id">;
  coachMessages!: EntityTable<CoachMessage, "id">;
  notificationSettings!: EntityTable<NotificationSettings, "id">;

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

    // --- 2. Aşama: Beslenme, Uyku/Vücut/Kalp/Aktivite, Zihin, Üretkenlik,
    // Finans, Alışkanlık & Hedef, Takvim & Rutin, rozetler, Koç, bildirimler ---
    this.version(2).stores({
      foods: "id, name",
      recipes: "id, name",
      mealEntries: "id, date, at, mealType, deletedAt",
      mealTemplates: "id, mealType",
      mealPhotos: "id",
      nutritionSettings: "id",
      supplements: "id",
      supplementLogs: "id, supplementId, date",

      sleepEntries: "id, date, deletedAt",
      bodyMetrics: "id, date, deletedAt",
      bodyPhotos: "id",
      heartMetrics: "id, date",
      activityDaily: "id, date",
      healthImportBatches: "id, importedAt",

      moodEntries: "id, at, deletedAt",
      journalEntries: "id, date, deletedAt",
      gratitudeEntries: "id, date",
      books: "id, status",
      readingLogs: "id, bookId",

      tasks: "id, bucket, projectId",
      projects: "id, archivedAt",
      focusSessions: "id, startedAt, projectId",

      categoryBudgets: "id, category",
      subscriptions: "id, nextRenewalDate",
      savingsGoals: "id",
      savingsContributions: "id, goalId",

      habits: "id, archivedAt",
      habitLogs: "id, habitId, date",
      longTermGoals: "id",

      scheduleBlocks: "id, date",
      routineTemplates: "id, type",
      importantDates: "id, date",

      earnedBadges: "id, badgeId",
      coachMessages: "id, createdAt",
      notificationSettings: "id",
    });
  }
}

export const db = new MertOSDB();
