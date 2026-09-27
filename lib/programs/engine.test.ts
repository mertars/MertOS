import { describe, expect, it } from "vitest";
import {
  averageFeel,
  capWeeklyRunIncrease,
  getCurrentWeekNumber,
  getPlannedSessionsThisWeekSoFar,
  getScheduledDayForDate,
  isDeloadWeek,
  suggestIntervalAdjustment,
} from "./engine";
import { KONDISYON_8_HAFTA } from "./kondisyon-8-hafta";
import type { ProgramProgress, Workout } from "@/lib/db/types";

function progress(startedAt: string): ProgramProgress {
  return { id: "p", programId: KONDISYON_8_HAFTA.id, startedAt, currentWeek: 1, adjustments: [], updatedAt: "" };
}

// Sabit bir referans: 2025-01-06 Pazartesi (haftanın başı, weekStartsOn: 1 ile hizalı).
const REF_MONDAY = new Date("2025-01-06T08:00:00");

describe("getCurrentWeekNumber", () => {
  it("progress yoksa hafta 1 döner", () => {
    expect(getCurrentWeekNumber(KONDISYON_8_HAFTA, undefined, REF_MONDAY)).toBe(1);
  });
  it("3 takvim haftası geçtiyse hafta 4 döner", () => {
    const startedThreeWeeksBefore = new Date("2024-12-16T08:00:00"); // 3 hafta önceki Pazartesi
    expect(getCurrentWeekNumber(KONDISYON_8_HAFTA, progress(startedThreeWeeksBefore.toISOString()), REF_MONDAY)).toBe(4);
  });
  it("program bitiminden sonra son haftada sabitlenir", () => {
    const startedLongAgo = new Date("2020-01-01T08:00:00");
    expect(getCurrentWeekNumber(KONDISYON_8_HAFTA, progress(startedLongAgo.toISOString()), REF_MONDAY)).toBe(8);
  });
});

describe("isDeloadWeek", () => {
  it("4. ve 8. haftalar deload'dur", () => {
    expect(isDeloadWeek(KONDISYON_8_HAFTA, 4)).toBe(true);
    expect(isDeloadWeek(KONDISYON_8_HAFTA, 8)).toBe(true);
  });
  it("diğer haftalar deload değildir", () => {
    expect(isDeloadWeek(KONDISYON_8_HAFTA, 1)).toBe(false);
  });
});

describe("getScheduledDayForDate", () => {
  it("planlanmamış bir günde null döner (örn. Pazartesi)", () => {
    const monday = new Date("2025-01-06T08:00:00"); // Pazartesi
    expect(getScheduledDayForDate(KONDISYON_8_HAFTA, undefined, monday)).toBeNull();
  });
  it("Salı günü Gün A'yı döner", () => {
    const tuesday = new Date("2025-01-07T08:00:00");
    const result = getScheduledDayForDate(KONDISYON_8_HAFTA, undefined, tuesday);
    expect(result?.day.kind).toBe("kosu");
  });
});

describe("getPlannedSessionsThisWeekSoFar", () => {
  it("Pazartesi 0 döner", () => {
    expect(getPlannedSessionsThisWeekSoFar(new Date("2025-01-06T08:00:00"))).toBe(0);
  });
  it("Cumartesi 3 döner", () => {
    expect(getPlannedSessionsThisWeekSoFar(new Date("2025-01-11T08:00:00"))).toBe(3);
  });
});

describe("capWeeklyRunIncrease", () => {
  it("%10'dan fazla artışı sınırlar", () => {
    expect(capWeeklyRunIncrease(30, 40, false)).toBe(33);
  });
  it("deload sonrası eski tepeye dönüşe izin verir", () => {
    expect(capWeeklyRunIncrease(25, 35, true)).toBe(35);
  });
  it("azalışı sınırlamaz", () => {
    expect(capWeeklyRunIncrease(30, 20, false)).toBe(20);
  });
});

describe("suggestIntervalAdjustment", () => {
  it("veri yoksa nötr öneri verir", () => {
    expect(suggestIntervalAdjustment(null).deltaRounds).toBe(0);
  });
  it("yüksek RPE'de tur azaltır", () => {
    expect(suggestIntervalAdjustment(4.7).deltaRounds).toBe(-1);
  });
  it("düşük RPE'de tur artırır", () => {
    expect(suggestIntervalAdjustment(1.5).deltaRounds).toBe(1);
  });
});

describe("averageFeel", () => {
  it("feel alanı olan antrenmanların ortalamasını alır", () => {
    const workouts = [{ feel: 2 }, { feel: 4 }] as Workout[];
    expect(averageFeel(workouts)).toBe(3);
  });
  it("hiç feel yoksa null döner", () => {
    expect(averageFeel([{} as Workout])).toBeNull();
  });
});
