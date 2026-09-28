// MertOS — Dexie veri modeli tipleri.
// Bu dosya TÜM uygulamanın (1. ve 2. aşama) veri sözleşmesini tanımlamaya adaydır;
// 2. aşamada yeni tablolar eklenirken burada yeni interface'ler + schema.ts'de
// yeni bir `db.version(N)` migration'ı açılacak. Var olan alanlar geriye dönük
// uyumlu kalacak şekilde genişletilmeli, kırılarak değiştirilmemeli.

export type ID = string;

// ---------------------------------------------------------------------------
// Profil & Ayarlar
// ---------------------------------------------------------------------------

export type Sex = "erkek" | "kadin" | "belirtilmedi";

export interface Profile {
  id: ID; // singleton: 'me'
  name: string;
  birthDate?: string; // yyyy-MM-dd
  heightCm?: number;
  weightKg?: number;
  weightGoalKg?: number;
  sex?: Sex;
  createdAt: string;
  updatedAt: string;
}

export type ThemeMode = "koyu" | "acik" | "sistem";
export type UnitSystem = "metrik" | "imperial";

export interface ScoreWeights {
  hareket: number;
  yakit: number;
  temiz: number;
  zihin: number;
}

export interface AppSettings {
  id: ID; // singleton: 'app'
  theme: ThemeMode;
  accentOverride?: string | null;
  unitSystem: UnitSystem;
  pinEnabled: boolean;
  pinHash?: string;
  pinSalt?: string;
  pinLength?: number;
  /** moduleId -> etkin mi. Registry'de tanımlı ama burada false olan modüller UI'dan gizlenir. */
  moduleToggles: Record<string, boolean>;
  scoreWeights: ScoreWeights;
  dashboardCardOrder: string[];
  dashboardCardHidden: string[];
  onboardingDone: boolean;
  lastBackupAt?: string | null;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Antrenman & Kondisyon
// ---------------------------------------------------------------------------

export type WorkoutType =
  | "kosu"
  | "interval"
  | "kuvvet"
  | "halisaha"
  | "yuruyus"
  | "ip_atlama"
  | "serbest";

/** 1 = çok kolay … 5 = çok zor (RPE benzeri basitleştirilmiş algı skalası). */
export type WorkoutFeel = 1 | 2 | 3 | 4 | 5;

export interface IntervalRound {
  workSec: number;
  restSec: number;
  count: number;
}

export interface Workout {
  id: ID;
  type: WorkoutType;
  date: string; // yyyy-MM-dd (yerel gün, Europe/Istanbul)
  startedAt: string; // ISO
  endedAt?: string;
  durationSec: number;
  distanceM?: number;
  avgHr?: number;
  maxHr?: number;
  vo2max?: number;
  feel?: WorkoutFeel;
  notes?: string;
  programId?: ID;
  programWeek?: number;
  programDayId?: string;
  source: "manuel" | "program" | "canli_oturum";
  intervalRounds?: IntervalRound[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface StrengthSet {
  id: ID;
  workoutId: ID;
  exerciseId: string;
  exerciseName: string;
  setIndex: number;
  weightKg?: number;
  reps?: number;
  rpe?: number;
  restSec?: number;
  createdAt: string;
}

export type PersonalRecordCategory =
  | "run_1k"
  | "run_5k"
  | "run_10k"
  | "longest_run"
  | `exercise:${string}:max_weight`
  | `exercise:${string}:max_reps`;

export interface PersonalRecord {
  id: ID;
  category: string;
  label: string;
  value: number;
  unit: string;
  date: string;
  workoutId?: ID;
  createdAt: string;
}

// --- Program motoru ---

export interface StrengthPrescription {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string; // "8-10" gibi aralık olabilir
  restSec: number;
  notes?: string;
}

export interface RunPrescription {
  targetMinutes: number;
  hrZone: 1 | 2 | 3 | 4 | 5;
  note?: string;
}

export interface IntervalPrescription {
  warmupMin: number;
  rounds: IntervalRound;
  finisherNote?: string;
}

export interface ProgramDay {
  id: string;
  label: string;
  kind: WorkoutType;
  description: string;
  durationMin?: number;
  run?: RunPrescription;
  interval?: IntervalPrescription;
  strength?: StrengthPrescription[];
  finisher?: { label: string; rounds: number; workSec: number; restSec: number };
}

export interface ProgramWeek {
  weekNumber: number;
  isDeload: boolean;
  focus: string;
  days: ProgramDay[];
}

export interface Program {
  id: ID;
  name: string;
  description: string;
  weeks: ProgramWeek[];
  isCustom: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramAdjustment {
  date: string;
  weekNumber: number;
  note: string;
}

export interface ProgramProgress {
  id: ID; // == programId
  programId: ID;
  startedAt: string;
  currentWeek: number;
  adjustments: ProgramAdjustment[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Su
// ---------------------------------------------------------------------------

export interface WaterEntry {
  id: ID;
  amountMl: number;
  at: string; // ISO
  createdAt: string;
  deletedAt?: string | null;
}

// ---------------------------------------------------------------------------
// Sigara
// ---------------------------------------------------------------------------

export type CigaretteTrigger =
  | "kahve"
  | "stres"
  | "yemek_sonrasi"
  | "sosyal"
  | "can_sikintisi"
  | "is"
  | "diger";

export interface CigaretteEntry {
  id: ID;
  at: string; // ISO
  trigger?: CigaretteTrigger;
  createdAt: string;
  deletedAt?: string | null;
}

export interface ReductionPlan {
  startDate: string;
  startAvgPerDay: number;
  targetAvgPerDay: number;
  targetDate: string;
  weeklyStepPct: number;
}

export interface CigaretteSettings {
  id: ID; // singleton: 'sigara'
  packPrice: number;
  cigsPerPack: number;
  baselineAvgPerDay: number;
  quitMode: boolean;
  quitDate?: string | null;
  reduction?: ReductionPlan | null;
  minGapMinutesGoal?: number;
  trainingProtectionEnabled: boolean;
  trainingProtectionWindowMin: number;
  goalItems: { id: string; label: string; priceTl: number }[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Finans (yalnızca köprü — 2. aşamada tam modül)
// ---------------------------------------------------------------------------

export type TransactionType = "gelir" | "gider";

export interface Expense {
  id: ID;
  date: string; // yyyy-MM-dd
  amount: number;
  category: string;
  source: string; // 'sigara' | 'manuel' | ...
  note?: string;
  /** 2. aşamada eklendi — yoksa (1. aşamadan kalan sigara kayıtları) "gider" varsayılır. */
  type?: TransactionType;
  createdAt: string;
  deletedAt?: string | null;
}

// ---------------------------------------------------------------------------
// Hızlı Ekle kullanım geçmişi
// ---------------------------------------------------------------------------

export interface QuickAddUsage {
  id: ID; // == actionKey
  actionKey: string;
  lastUsedAt: string;
  count: number;
}

// =============================================================================
// 2. AŞAMA — aşağıdaki tüm tipler Dexie v2 migration'ıyla eklendi (bkz. schema.ts)
// =============================================================================

// ---------------------------------------------------------------------------
// Beslenme
// ---------------------------------------------------------------------------

export type MealType = "kahvalti" | "ogle" | "aksam" | "atistirmalik";

export interface FoodMacro {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

/** `unit` bir porsiyon birimini insan-okunur tanımlar (örn. "100 g", "adet", "dilim", "su bardağı"). */
export interface FoodItem {
  id: ID;
  name: string;
  unit: string;
  macroPerUnit: FoodMacro;
  isCustom: boolean;
  createdAt: string;
}

export interface RecipeIngredient {
  foodId: string;
  quantity: number;
}

export interface Recipe {
  id: ID;
  name: string;
  servings: number;
  ingredients: RecipeIngredient[];
  createdAt: string;
}

export interface MealEntryItem {
  foodId: string;
  name: string;
  quantity: number;
  unit: string;
  macro: FoodMacro; // quantity uygulanmış toplam
}

export interface MealEntry {
  id: ID;
  date: string;
  at: string;
  mealType: MealType;
  items: MealEntryItem[];
  photoId?: string;
  note?: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface MealTemplate {
  id: ID;
  name: string;
  mealType: MealType;
  items: MealEntryItem[];
  isBuiltIn: boolean;
  createdAt: string;
}

export interface MealPhoto {
  id: ID;
  blob: Blob;
  createdAt: string;
}

export interface Supplement {
  id: ID;
  name: string;
  dosage?: string;
  timeOfDay?: string; // "sabah" | "öğle" | "akşam" gibi serbest metin
  active: boolean;
  createdAt: string;
}

export interface SupplementLog {
  id: ID;
  supplementId: string;
  date: string;
  taken: boolean;
}

export type NutritionGoalMode = "koru" | "hafif_bulk" | "cut";
export type ActivityLevel = 1 | 2 | 3 | 4 | 5;

export interface NutritionSettings {
  id: ID; // singleton: 'beslenme'
  mode: NutritionGoalMode;
  proteinGPerKg: number;
  activityLevel: ActivityLevel;
  carbBoostOnTrainingDayPct: number;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Uyku / Vücut / Kalp / Aktivite
// ---------------------------------------------------------------------------

export type HealthSource = "manuel" | "apple-health";

export interface SleepPhases {
  deepMin?: number;
  remMin?: number;
  lightMin?: number;
  awakeMin?: number;
}

export interface SleepEntry {
  id: ID;
  date: string; // uyanılan gün
  bedTime: string;
  wakeTime: string;
  durationMin: number;
  quality?: 1 | 2 | 3 | 4 | 5;
  phases?: SleepPhases;
  source: HealthSource;
  createdAt: string;
  deletedAt?: string | null;
}

export interface BodyPhoto {
  id: ID;
  blob: Blob;
  createdAt: string;
}

export interface BodyMetricEntry {
  id: ID;
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  photoId?: string;
  source: HealthSource;
  createdAt: string;
  deletedAt?: string | null;
}

export interface HeartMetricEntry {
  id: ID;
  date: string;
  restingHr?: number;
  hrv?: number;
  vo2max?: number;
  source: HealthSource;
  createdAt: string;
}

export interface ActivityDailyEntry {
  id: ID; // == date (yyyy-MM-dd)
  date: string;
  steps?: number;
  activeEnergyKcal?: number;
  source: HealthSource;
  updatedAt: string;
}

export type HealthSourceKind = "apple-shortcuts" | "health-auto-export" | "manuel";

export interface HealthImportBatch {
  id: ID;
  importedAt: string;
  sourceKind: HealthSourceKind;
  summary: string;
}

// ---------------------------------------------------------------------------
// Zihin
// ---------------------------------------------------------------------------

export interface MoodEntry {
  id: ID;
  at: string;
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  stress: 1 | 2 | 3 | 4 | 5;
  note?: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface JournalEntry {
  id: ID;
  date: string;
  text: string;
  prompt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface GratitudeEntry {
  id: ID;
  date: string;
  items: string[];
  createdAt: string;
}

export type BookStatus = "okunuyor" | "bitti" | "birakildi";

export interface Book {
  id: ID;
  title: string;
  author?: string;
  totalPages?: number;
  currentPage: number;
  status: BookStatus;
  startedAt: string;
  finishedAt?: string;
  createdAt: string;
}

export interface ReadingLog {
  id: ID;
  bookId: string;
  page: number;
  at: string;
}

// ---------------------------------------------------------------------------
// Üretkenlik
// ---------------------------------------------------------------------------

export type TaskBucket = "bugun" | "yakinda" | "bir-gun";
export type TaskPriority = "dusuk" | "orta" | "yuksek";

export interface Task {
  id: ID;
  title: string;
  done: boolean;
  priority: TaskPriority;
  bucket: TaskBucket;
  projectId?: string;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  deletedAt?: string | null;
}

export interface Project {
  id: ID;
  name: string;
  colorVar: string;
  note?: string;
  createdAt: string;
  archivedAt?: string | null;
}

export interface FocusSession {
  id: ID;
  startedAt: string;
  endedAt?: string;
  targetDurationSec: number;
  actualDurationSec: number;
  projectId?: string;
  taskId?: string;
  completed: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Finans
// ---------------------------------------------------------------------------

export interface CategoryBudget {
  id: ID;
  category: string;
  monthlyLimitTl: number;
}

export type BillingCycle = "aylik" | "yillik";

export interface Subscription {
  id: ID;
  name: string;
  amountTl: number;
  billingCycle: BillingCycle;
  nextRenewalDate: string;
  category?: string;
  active: boolean;
  createdAt: string;
}

export interface SavingsGoal {
  id: ID;
  name: string;
  targetTl: number;
  targetDate?: string;
  createdAt: string;
  achievedAt?: string | null;
}

export interface SavingsContribution {
  id: ID;
  goalId: string;
  amount: number;
  date: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Alışkanlık & Hedef
// ---------------------------------------------------------------------------

export type HabitFrequencyType = "gunluk" | "haftanin-gunleri" | "haftada-x";

export interface HabitFrequency {
  type: HabitFrequencyType;
  days?: number[]; // 0=Pazar..6=Cumartesi
  timesPerWeek?: number;
}

export interface Habit {
  id: ID;
  name: string;
  colorVar: string;
  frequency: HabitFrequency;
  createdAt: string;
  archivedAt?: string | null;
}

export interface HabitLog {
  id: ID;
  habitId: string;
  date: string;
  done: boolean;
}

export interface GoalMilestone {
  id: string;
  label: string;
  done: boolean;
  doneAt?: string;
}

export type LinkedMetricType = "run_10k_under_min" | "run_5k_under_min" | "longest_run_km" | "none";

export interface LongTermGoal {
  id: ID;
  title: string;
  description?: string;
  targetDate?: string;
  milestones: GoalMilestone[];
  linkedMetric?: LinkedMetricType;
  linkedMetricTargetValue?: number;
  manualProgressPercent?: number;
  createdAt: string;
  achievedAt?: string | null;
}

// ---------------------------------------------------------------------------
// Takvim & Rutin
// ---------------------------------------------------------------------------

export interface ScheduleBlock {
  id: ID;
  date: string;
  startTime: string; // "06:00"
  endTime: string;
  label: string;
  colorVar?: string;
  completed?: boolean;
  createdAt: string;
}

export type RoutineType = "sabah" | "aksam" | "haftaici" | "haftasonu" | "antrenman-gunu";

export interface RoutineBlockTemplate {
  label: string;
  time: string;
  durationMin: number;
}

export interface RoutineTemplate {
  id: ID;
  name: string;
  type: RoutineType;
  blocks: RoutineBlockTemplate[];
  createdAt: string;
}

export interface ImportantDate {
  id: ID;
  label: string;
  date: string;
  repeatsYearly: boolean;
  note?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Rozetler
// ---------------------------------------------------------------------------

export interface EarnedBadge {
  id: ID;
  badgeId: string;
  earnedAt: string;
}

// ---------------------------------------------------------------------------
// AI Koç
// ---------------------------------------------------------------------------

export type CoachRequestKind = "brifing" | "haftalik_rapor" | "sohbet" | "program_onerisi";

export interface CoachMessage {
  id: ID;
  role: "user" | "assistant";
  content: string;
  /** Bu mesajı tetikleyen aksiyon — sadece asistan mesajlarında anlamlı, sohbet mesajlarında yok. */
  kind?: CoachRequestKind;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Bildirimler
// ---------------------------------------------------------------------------

export type NotificationCategory =
  | "su"
  | "antrenman"
  | "sigara"
  | "uyku"
  | "beslenme"
  | "gorevler"
  | "aliskanliklar"
  | "haftalik_rapor"
  | "koc";

export type PersistenceLevel = "sakin" | "normal" | "israrci";

export interface NotificationCategorySettings {
  enabled: boolean;
  hours: string[];
  persistence: PersistenceLevel;
  templates: string[];
}

export interface NotificationSettings {
  id: ID; // singleton: 'bildirim'
  pushSubscriptionJson?: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  categories: Record<NotificationCategory, NotificationCategorySettings>;
  dailyCoachRequestLimit: number;
  updatedAt: string;
}
