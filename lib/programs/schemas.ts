import { z } from "zod";

export const WORKOUT_TYPES = ["kosu", "interval", "kuvvet", "halisaha", "yuruyus", "ip_atlama", "serbest"] as const;

export const manualWorkoutSchema = z.object({
  type: z.enum(WORKOUT_TYPES, { message: "Bir antrenman türü seç" }),
  date: z.string().min(1, "Tarih gerekli"),
  durationMin: z.coerce
    .number({ error: "Süre sayı olmalı" })
    .min(1, "Süre en az 1 dakika olmalı")
    .max(600, "Süre çok uzun görünüyor, tekrar kontrol et"),
  distanceKm: z.coerce.number().min(0, "Mesafe negatif olamaz").max(200, "Mesafe çok büyük görünüyor").optional(),
  avgHr: z.coerce.number().min(30, "Nabız çok düşük görünüyor").max(230, "Nabız çok yüksek görünüyor").optional(),
  maxHr: z.coerce.number().min(30, "Nabız çok düşük görünüyor").max(230, "Nabız çok yüksek görünüyor").optional(),
  feel: z.coerce.number().min(1).max(5).optional(),
  notes: z.string().max(500, "Not en fazla 500 karakter olabilir").optional(),
});

export type ManualWorkoutInput = z.infer<typeof manualWorkoutSchema>;

export const strengthSetSchema = z.object({
  exerciseName: z.string().min(1, "Hareket adı gerekli").max(60),
  weightKg: z.coerce.number().min(0, "Ağırlık negatif olamaz").max(500).optional(),
  reps: z.coerce.number().min(1, "En az 1 tekrar olmalı").max(200).optional(),
  rpe: z.coerce.number().min(1).max(10).optional(),
});

export const reductionPlanSchema = z.object({
  targetAvgPerDay: z.coerce.number().min(0, "Hedef negatif olamaz").max(60, "Hedef çok yüksek görünüyor"),
  targetWeeks: z.coerce.number().min(1, "En az 1 hafta olmalı").max(52, "En fazla 52 hafta"),
});

export function formatZodError(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
