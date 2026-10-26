import { describe, expect, it } from "vitest";
import { DEFAULT_CHORES, DEFAULT_SCHEDULE } from "@/data/assistant/defaults";
import { buildDailyBrief, choresForDate, computeWeeklyConsistency, currentMealType, dayTypeFor, routineItemsForDay } from "./daily";
import { addDays, isoWeekNumber, istanbulNow, weekStart } from "./time";
import type { RoutineLogRow } from "./types";

// 2026-10-26 bir Pazartesi.
const MON = "2026-10-26";

describe("istanbulNow", () => {
  it("UTC gece yarısından önceki saati Türkiye'de ertesi gün sayar (UTC+3)", () => {
    const n = istanbulNow(new Date("2026-10-25T22:30:00Z"));
    expect(n.date).toBe("2026-10-26");
    expect(n.time).toBe("01:30");
    expect(n.weekday).toBe(1);
  });
});

describe("dayTypeFor", () => {
  it("Pzt/Çar/Cum/Paz koşu, Sal/Per/Cmt yürüyüş", () => {
    const types = Array.from({ length: 7 }, (_, i) => dayTypeFor(addDays(MON, i)));
    expect(types).toEqual(["kosu", "yuruyus", "kosu", "yuruyus", "kosu", "yuruyus", "kosu"]);
  });
});

describe("routineItemsForDay", () => {
  it("koşu gününde wall sit yok, yürüyüş gününde var", () => {
    expect(routineItemsForDay(DEFAULT_SCHEDULE, "kosu")).toContain("kosu");
    expect(routineItemsForDay(DEFAULT_SCHEDULE, "kosu")).not.toContain("wall_sit");
    expect(routineItemsForDay(DEFAULT_SCHEDULE, "yuruyus")).toEqual(expect.arrayContaining(["yuruyus", "wall_sit"]));
  });
});

describe("choresForDate", () => {
  it("bulaşık her gün, çamaşır Pazartesi", () => {
    expect(choresForDate(DEFAULT_CHORES, MON).map((c) => c.title)).toEqual(["Bulaşık", "Çamaşır"]);
  });
  it("genel temizlik Cumartesi ve alan haftadan haftaya döner", () => {
    const sat1 = addDays(MON, 5);
    const sat2 = addDays(sat1, 7);
    const a = choresForDate(DEFAULT_CHORES, sat1).find((c) => c.id === "genel-temizlik")!.title;
    const b = choresForDate(DEFAULT_CHORES, sat2).find((c) => c.id === "genel-temizlik")!.title;
    expect(a).not.toBe(b);
    expect(a.startsWith("Genel temizlik: ")).toBe(true);
  });
  it("ISO hafta numarası doğru", () => {
    expect(isoWeekNumber("2026-01-01")).toBe(1);
    expect(isoWeekNumber(MON)).toBe(44);
  });
});

describe("computeWeeklyConsistency", () => {
  it("haftayı Pazartesi'den sayar ve oranları hesaplar", () => {
    const wed = addDays(MON, 2);
    const log: RoutineLogRow[] = [
      { date: MON, item: "kosu", done: true, updatedAt: "" },
      { date: MON, item: "uyanis", done: true, updatedAt: "" },
      { date: addDays(MON, 1), item: "yuruyus", done: true, updatedAt: "" },
      { date: addDays(MON, 1), item: "wall_sit", done: false, updatedAt: "" },
      // geçen haftaya ait — sayılmamalı
      { date: addDays(MON, -1), item: "kosu", done: true, updatedAt: "" },
    ];
    const w = computeWeeklyConsistency({ date: wed, schedule: DEFAULT_SCHEDULE, routineLog: log, mealLog: [] });
    expect(weekStart(wed)).toBe(MON);
    expect(w.daysElapsed).toBe(3);
    expect(w.runs).toEqual({ done: 1, planned: 2 });
    expect(w.walks).toEqual({ done: 1, planned: 1 });
    expect(w.routine.done).toBe(3);
    expect(w.mealLogs.expected).toBe(9);
  });
});

describe("buildDailyBrief", () => {
  const base = { date: MON, time: "07:00", hitap: "Mert Bey", schedule: DEFAULT_SCHEDULE, meals: [], mealLog: [], chores: DEFAULT_CHORES };

  it("tarif yokken de çalışır (LLM'siz, boş veriyle)", () => {
    const b = buildDailyBrief({ ...base, routineLog: [] });
    expect(b.dayType).toBe("kosu");
    expect(b.weekdayName).toBe("Pazartesi");
    expect(b.meals.every((m) => m.suggestion.kind === "yok")).toBe(true);
    expect(b.decision).toBe("Mert Bey, Koşu günü: 6,5 km Zone 2 koşu.");
  });

  it("yapılan maddeleri işaretler ve kararda koşuyu tamam sayar", () => {
    const b = buildDailyBrief({ ...base, routineLog: [{ date: MON, item: "kosu", done: true, updatedAt: "" }] });
    expect(b.schedule.find((s) => s.routineItem === "kosu")!.done).toBe(true);
    expect(b.routine.done).toBe(1);
    expect(b.decision).toContain("koşu tamam");
  });

  it("hitap ayardan gelir", () => {
    expect(buildDailyBrief({ ...base, hitap: "Kaptan", routineLog: [] }).decision.startsWith("Kaptan,")).toBe(true);
  });
});

describe("currentMealType", () => {
  it("saate göre öğün", () => {
    expect(currentMealType("08:00")).toBe("kahvalti");
    expect(currentMealType("12:30")).toBe("ogle");
    expect(currentMealType("20:00")).toBe("aksam");
  });
});
