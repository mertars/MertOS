import { z } from "zod";

/**
 * MertOS Sync — normalize edilmiş sağlık verisi sözleşmesi.
 * "MertOS Sync" iOS Kestirmesi bu şekli üretir (bkz. README § Apple Sağlık
 * Köprüsü). Health Auto Export gibi başka kaynaklar `parsers.ts` içinde bu
 * şekle çevrilir — böylece geri kalan her şey (önizleme, dedup, kayıt) tek
 * bir normalize şemaya karşı çalışır.
 */

export const importedWorkoutSchema = z.object({
  type: z.enum(["kosu", "interval", "kuvvet", "halisaha", "yuruyus", "ip_atlama", "serbest"]).default("serbest"),
  startedAt: z.string(),
  durationSec: z.coerce.number().min(1),
  distanceM: z.coerce.number().min(0).optional(),
  avgHr: z.coerce.number().min(30).max(230).optional(),
  maxHr: z.coerce.number().min(30).max(230).optional(),
  vo2max: z.coerce.number().min(10).max(90).optional(),
});

export const importedSleepSchema = z.object({
  bedTime: z.string(),
  wakeTime: z.string(),
  durationMin: z.coerce.number().min(1).optional(),
  quality: z.coerce.number().min(1).max(5).optional(),
  deepMin: z.coerce.number().min(0).optional(),
  remMin: z.coerce.number().min(0).optional(),
  lightMin: z.coerce.number().min(0).optional(),
  awakeMin: z.coerce.number().min(0).optional(),
});

export const healthImportPayloadSchema = z.object({
  source: z.enum(["apple-shortcuts", "health-auto-export", "manuel"]).default("apple-shortcuts"),
  generatedAt: z.string().optional(),
  workouts: z.array(importedWorkoutSchema).default([]),
  steps: z.coerce.number().min(0).optional(),
  activeEnergyKcal: z.coerce.number().min(0).optional(),
  restingHr: z.coerce.number().min(20).max(150).optional(),
  hrv: z.coerce.number().min(0).max(300).optional(),
  vo2max: z.coerce.number().min(10).max(90).optional(),
  weightKg: z.coerce.number().min(20).max(300).optional(),
  sleep: importedSleepSchema.optional(),
});

export type ImportedWorkout = z.infer<typeof importedWorkoutSchema>;
export type ImportedSleep = z.infer<typeof importedSleepSchema>;
export type HealthImportPayload = z.infer<typeof healthImportPayloadSchema>;
