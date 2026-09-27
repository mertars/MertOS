import { describe, expect, it } from "vitest";
import {
  computeCigaretteLimit,
  computeDailyScore,
  computeHareketRing,
  computeStreak,
  computeTemizRing,
  computeWaterGoalMl,
  computeYakitRing,
  DEFAULT_SCORE_WEIGHTS,
} from "./engine";

describe("computeWaterGoalMl", () => {
  it("kilo x 35 ml hesaplar", () => {
    expect(computeWaterGoalMl(80, false)).toBe(2800);
  });
  it("antrenman gününde +500 ml ekler", () => {
    expect(computeWaterGoalMl(80, true)).toBe(3300);
  });
  it("kilo belirtilmemişse 75 kg varsayar", () => {
    expect(computeWaterGoalMl(undefined, false)).toBe(2625);
  });
});

describe("computeYakitRing", () => {
  it("hedefin yarısında %50 döner", () => {
    expect(computeYakitRing(1000, 2000)).toBe(50);
  });
  it("100'ü geçmez", () => {
    expect(computeYakitRing(5000, 2000)).toBe(100);
  });
  it("hedef 0 ise 0 döner", () => {
    expect(computeYakitRing(100, 0)).toBe(0);
  });
});

describe("computeCigaretteLimit", () => {
  it("bırakma modunda limit 0'dır", () => {
    expect(computeCigaretteLimit({ quitMode: true, reduction: null, baselineAvgPerDay: 10 }, new Date())).toBe(0);
  });
  it("plan yoksa baseline döner", () => {
    expect(computeCigaretteLimit({ quitMode: false, reduction: null, baselineAvgPerDay: 8 }, new Date())).toBe(8);
  });
  it("plan ortasında doğrusal interpolasyon yapar", () => {
    const start = new Date("2025-01-01");
    const end = new Date("2025-01-11");
    const mid = new Date("2025-01-06");
    const limit = computeCigaretteLimit(
      { quitMode: false, baselineAvgPerDay: 10, reduction: { startDate: start.toISOString(), startAvgPerDay: 10, targetAvgPerDay: 0, targetDate: end.toISOString(), weeklyStepPct: 10 } },
      mid,
    );
    expect(limit).toBe(5);
  });
});

describe("computeTemizRing", () => {
  it("limit altında yüksek skor verir", () => {
    expect(computeTemizRing(2, 10, false)).toBe(80);
  });
  it("limit aşılınca 0'a yaklaşır", () => {
    expect(computeTemizRing(20, 10, false)).toBe(0);
  });
  it("bırakma modunda hiç içilmemişse 100 döner", () => {
    expect(computeTemizRing(0, 0, true)).toBe(100);
  });
  it("bırakma modunda bir tane bile ciddi düşürür", () => {
    expect(computeTemizRing(1, 0, true)).toBeLessThan(100);
  });
});

describe("computeHareketRing", () => {
  it("bugün antrenman yapıldıysa 100 döner", () => {
    expect(computeHareketRing({ trainedToday: true, completedThisWeek: 0, plannedThisWeek: 3 })).toBe(100);
  });
  it("haftalık ilerlemeye göre kısmi puan verir", () => {
    const v = computeHareketRing({ trainedToday: false, completedThisWeek: 1, plannedThisWeek: 2 });
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThanOrEqual(90);
  });
});

describe("computeDailyScore", () => {
  it("eksik halkaları hariç tutarak yeniden normalize eder", () => {
    const result = computeDailyScore({ hareket: 100, yakit: 100, temiz: 100, zihin: null }, DEFAULT_SCORE_WEIGHTS);
    expect(result.total).toBe(100);
    expect(result.availableRings).toEqual(["hareket", "yakit", "temiz"]);
  });
  it("düşük halkalarda düşük toplam verir", () => {
    const result = computeDailyScore({ hareket: 0, yakit: 0, temiz: 0, zihin: null }, DEFAULT_SCORE_WEIGHTS);
    expect(result.total).toBe(0);
  });
});

describe("computeStreak", () => {
  it("sondan geriye ardışık başarılı günleri sayar", () => {
    expect(computeStreak([80, 40, 70, 65, 90], 60)).toBe(3);
  });
  it("hiç tutmayan günde 0 döner", () => {
    expect(computeStreak([80, 90, 40], 60)).toBe(0);
  });
});
