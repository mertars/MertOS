import type { Program, ProgramDay, ProgramWeek, StrengthPrescription } from "@/lib/db/types";

/**
 * "MertOS Kondisyon — 8 Hafta" — gömülü, düzenlenebilir başlangıç programı.
 * Bkz. görev tanımı § 6.1. Haftada 3 gün: Gün A (kolay koşu / taban),
 * Gün B (interval + patlayıcılık), Gün C (ev kuvvet devresi + finisher).
 * Her 4. hafta (4 ve 8) deload: hacim ~%30 düşük.
 *
 * Haftalık artış tablosu elle, %10 kuralına ve deload mantığına uyacak
 * şekilde kalibre edildi. Performansa göre esnetme (RPE tabanlı) için
 * bkz. lib/programs/engine.ts — bu dosya SADECE temel/statik planı tutar.
 */

const KUVVET_DEVRESI: Omit<StrengthPrescription, "sets">[] = [
  { exerciseId: "bulgar-split-squat", exerciseName: "Bulgarian Split Squat", reps: "10-12 (her bacak)", restSec: 20 },
  { exerciseId: "goblet-squat", exerciseName: "Goblet Squat", reps: "12-15", restSec: 20 },
  { exerciseId: "kettlebell-swing", exerciseName: "Kettlebell Swing", reps: "15-20", restSec: 20 },
  { exerciseId: "sinav-ayak-yuksek", exerciseName: "Şınav (ayak yüksekte, yavaş iniş)", reps: "8-12", restSec: 20 },
  { exerciseId: "sandalye-dips", exerciseName: "Sandalye Dips", reps: "10-15", restSec: 20 },
  { exerciseId: "barfiks", exerciseName: "Barfiks", reps: "3-6", restSec: 30 },
  { exerciseId: "tek-kol-dambil-row", exerciseName: "Tek Kol Dambıl Row", reps: "10-12 (her kol)", restSec: 20 },
  { exerciseId: "plank", exerciseName: "Plank", reps: "40-60 sn", restSec: 20 },
  { exerciseId: "hollow-hold", exerciseName: "Hollow Hold", reps: "20-30 sn", restSec: 30 },
];

interface WeekPlan {
  runMin: number;
  intervalRounds: number;
  circuitRounds: number;
  isDeload: boolean;
}

// Hafta 1..8 temel plan. Deload: 4 ve 8. %10 kuralı ardışık yükselen haftalarda korunur.
const WEEK_PLANS: WeekPlan[] = [
  { runMin: 30, intervalRounds: 6, circuitRounds: 3, isDeload: false }, // 1
  { runMin: 32, intervalRounds: 7, circuitRounds: 3, isDeload: false }, // 2
  { runMin: 35, intervalRounds: 8, circuitRounds: 4, isDeload: false }, // 3
  { runMin: 25, intervalRounds: 6, circuitRounds: 3, isDeload: true }, // 4 — deload
  { runMin: 35, intervalRounds: 8, circuitRounds: 4, isDeload: false }, // 5
  { runMin: 37, intervalRounds: 9, circuitRounds: 4, isDeload: false }, // 6
  { runMin: 40, intervalRounds: 10, circuitRounds: 4, isDeload: false }, // 7
  { runMin: 28, intervalRounds: 7, circuitRounds: 3, isDeload: true }, // 8 — deload / taper
];

function buildWeek(weekNumber: number): ProgramWeek {
  const plan = WEEK_PLANS[weekNumber - 1];

  const gunA: ProgramDay = {
    id: `w${weekNumber}-a`,
    label: "Gün A — Kolay Koşu (Taban)",
    kind: "kosu",
    description: `${plan.runMin} dk konuşma temposunda koşu (gerekirse koş-yürü). Hedef nabız bölgesi 2.`,
    durationMin: plan.runMin,
    run: { targetMinutes: plan.runMin, hrZone: 2, note: "Konuşabildiğin bir tempoda kal." },
  };

  const gunB: ProgramDay = {
    id: `w${weekNumber}-b`,
    label: "Gün B — Interval + Patlayıcılık",
    kind: "interval",
    description: `10 dk ısınma → 30 sn tam gaz / 90 sn yürüyüş × ${plan.intervalRounds} → 10 dk ip atlama (3 dk atla / 1 dk dinlen). Halısaha oynanan hafta bu gün yerine sayılabilir.`,
    durationMin: 10 + Math.round((plan.intervalRounds * 120) / 60) + 10,
    interval: {
      warmupMin: 10,
      rounds: { workSec: 30, restSec: 90, count: plan.intervalRounds },
      finisherNote: "10 dk ip atlama: 3 dk atla / 1 dk dinlen",
    },
    finisher: { label: "İp Atlama", rounds: 2, workSec: 180, restSec: 60 },
  };

  const gunC: ProgramDay = {
    id: `w${weekNumber}-c`,
    label: "Gün C — Ev Kuvvet Devresi + Finisher",
    kind: "kuvvet",
    description: `9 hareketlik devre × ${plan.circuitRounds} tur. Sonunda 5 dk EMOM (her dakika 8 burpee).`,
    durationMin: 35,
    strength: KUVVET_DEVRESI.map((ex) => ({ ...ex, sets: plan.circuitRounds })),
    finisher: { label: "EMOM — 8 Burpee", rounds: 5, workSec: 60, restSec: 0 },
  };

  return {
    weekNumber,
    isDeload: plan.isDeload,
    focus: plan.isDeload
      ? "Deload — hacim ~%30 düşük, teknik ve dinlenme odaklı"
      : weekNumber < 4
        ? "Taban oluşturma"
        : "Kapasite artışı",
    days: [gunA, gunB, gunC],
  };
}

export const KONDISYON_8_HAFTA_ID = "prog-kondisyon-8-hafta";

export const KONDISYON_8_HAFTA: Program = {
  id: KONDISYON_8_HAFTA_ID,
  name: "MertOS Kondisyon — 8 Hafta",
  description:
    "Boksör/futbolcu seviyesinde kondisyon için 8 haftalık ev programı: patlayıcı güç, kesintisiz dayanıklılık, nefes kontrolü. Haftada 3 gün, sabah 06:00-07:00 arası önerilir.",
  weeks: Array.from({ length: 8 }, (_, i) => buildWeek(i + 1)),
  isCustom: false,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/** Haftanın hangi günlerinde antrenman planlandığı (JS Date.getDay(): 0=Pazar..6=Cumartesi). */
export const PROGRAM_SCHEDULE: Record<number, "a" | "b" | "c"> = {
  2: "a", // Salı — Gün A
  4: "b", // Perşembe — Gün B
  6: "c", // Cumartesi — Gün C
};

export const PROGRAM_SESSION_HOUR = { start: 6, end: 7 };
