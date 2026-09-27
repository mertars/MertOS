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

export interface Expense {
  id: ID;
  date: string; // yyyy-MM-dd
  amount: number;
  category: string;
  source: string; // 'sigara' | 'manuel' | ...
  note?: string;
  createdAt: string;
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
