import { describe, expect, it } from "vitest";
import { computeAvgPaceMinPerKm, computeHacimScore, computeKondisyonSkoru, computePaceScore, computeVo2maxScore } from "./kondisyon";
import type { Workout } from "@/lib/db/types";

function makeRun(distanceM: number, durationSec: number): Workout {
  return {
    id: "x",
    type: "kosu",
    date: "2025-01-01",
    startedAt: "2025-01-01T06:00:00.000Z",
    durationSec,
    distanceM,
    source: "manuel",
    createdAt: "",
    updatedAt: "",
  };
}

describe("computeAvgPaceMinPerKm", () => {
  it("mesafe/süreden pace hesaplar", () => {
    const pace = computeAvgPaceMinPerKm([makeRun(5000, 30 * 60)]);
    expect(pace).toBeCloseTo(6, 5);
  });
  it("geçerli koşu yoksa null döner", () => {
    expect(computeAvgPaceMinPerKm([])).toBeNull();
  });
});

describe("computePaceScore", () => {
  it("baseline pace'te 50 döner", () => {
    expect(computePaceScore(7.0)).toBe(50);
  });
  it("daha hızlı pace daha yüksek skor verir", () => {
    expect(computePaceScore(6.0)!).toBeGreaterThan(computePaceScore(7.0)!);
  });
  it("veri yoksa null döner", () => {
    expect(computePaceScore(null)).toBeNull();
  });
});

describe("computeVo2maxScore", () => {
  it("aralık dışında sınırlar", () => {
    expect(computeVo2maxScore(60)).toBe(100);
    expect(computeVo2maxScore(10)).toBe(0);
  });
});

describe("computeHacimScore", () => {
  it("hedefi tutturunca 100 döner", () => {
    expect(computeHacimScore(90, 90)).toBe(100);
  });
  it("hedef 0 ise nötr bir taban döner", () => {
    expect(computeHacimScore(0, 0)).toBe(60);
  });
});

describe("computeKondisyonSkoru", () => {
  it("sadece hacim verisiyle bile bir skor üretir", () => {
    const result = computeKondisyonSkoru({ recentRuns: [], latestVo2max: null, weeklyVolumeMin: 90, targetWeeklyVolumeMin: 90 });
    expect(result.score).toBe(100);
    expect(result.paceScore).toBeNull();
  });

  it("tüm girdiler varsa ağırlıklı ortalama alır", () => {
    const result = computeKondisyonSkoru({
      recentRuns: [makeRun(5000, 30 * 60)],
      latestVo2max: 45,
      weeklyVolumeMin: 90,
      targetWeeklyVolumeMin: 90,
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.paceScore).not.toBeNull();
    expect(result.vo2maxScore).not.toBeNull();
  });
});
