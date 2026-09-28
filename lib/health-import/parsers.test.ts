import { describe, expect, it } from "vitest";
import { HealthImportError, parseHealthImportInput } from "./parsers";

describe("parseHealthImportInput", () => {
  it("geçersiz JSON için HealthImportError fırlatır", () => {
    expect(() => parseHealthImportInput("bu json değil")).toThrow(HealthImportError);
  });

  it("MertOS Sync formatını doğrudan (varsayılanlarla) parse eder", () => {
    const payload = parseHealthImportInput(
      JSON.stringify({
        workouts: [{ type: "kosu", startedAt: "2026-01-10T08:00:00.000Z", durationSec: 1800, distanceM: 5000 }],
        steps: 8000,
        restingHr: 58,
      }),
    );
    expect(payload.source).toBe("apple-shortcuts");
    expect(payload.workouts).toHaveLength(1);
    expect(payload.workouts[0].type).toBe("kosu");
    expect(payload.steps).toBe(8000);
    expect(payload.restingHr).toBe(58);
  });

  it("Health Auto Export formatındaki antrenman isimlerini eşler ve mesafeyi metreye çevirir", () => {
    const payload = parseHealthImportInput(
      JSON.stringify({
        data: {
          workouts: [{ name: "Running", start: "2026-01-10 08:00:00", end: "2026-01-10 08:30:00", distance: { qty: 5 } }],
          metrics: [],
        },
      }),
    );
    expect(payload.workouts).toHaveLength(1);
    expect(payload.workouts[0].type).toBe("kosu");
    expect(payload.workouts[0].distanceM).toBe(5000);
    expect(payload.workouts[0].durationSec).toBe(1800);
  });

  it("bilinmeyen antrenman ismi için 'serbest' tipine düşer", () => {
    const payload = parseHealthImportInput(
      JSON.stringify({
        data: {
          workouts: [{ name: "Yoga", start: "2026-01-10 08:00:00", duration: 1200 }],
          metrics: [],
        },
      }),
    );
    expect(payload.workouts[0].type).toBe("serbest");
  });

  it("adım sayısı metriğinin günlük kayıtlarını toplar", () => {
    const payload = parseHealthImportInput(
      JSON.stringify({
        data: {
          workouts: [],
          metrics: [{ name: "step_count", data: [{ qty: 3000 }, { qty: 4500 }] }],
        },
      }),
    );
    expect(payload.steps).toBe(7500);
  });

  it("dinlenik nabız metriğinin son kaydını alır", () => {
    const payload = parseHealthImportInput(
      JSON.stringify({
        data: {
          workouts: [],
          metrics: [{ name: "resting_heart_rate", data: [{ qty: 60 }, { qty: 55 }] }],
        },
      }),
    );
    expect(payload.restingHr).toBe(55);
  });

  it("uyku analizini bedTime/wakeTime/süre olarak normalize eder", () => {
    const payload = parseHealthImportInput(
      JSON.stringify({
        data: {
          workouts: [],
          metrics: [
            {
              name: "sleep_analysis",
              data: [{ sleepStart: "2026-01-10 23:30:00", sleepEnd: "2026-01-11 07:30:00", asleep: 7.5 }],
            },
          ],
        },
      }),
    );
    expect(payload.sleep?.bedTime).toBe("2026-01-10 23:30:00");
    expect(payload.sleep?.wakeTime).toBe("2026-01-11 07:30:00");
    expect(payload.sleep?.durationMin).toBe(450);
  });

  it("izin verilen aralığın dışındaki bir metrik değeri için HealthImportError fırlatır", () => {
    const raw = JSON.stringify({
      workouts: [{ invalid: true }], // doğrudan şemayı bozar, Health Auto Export yoluna düşürür
      data: { metrics: [{ name: "resting_heart_rate", data: [{ qty: 999 }] }] }, // 999, izin verilen 20-150 aralığının dışında
    });
    expect(() => parseHealthImportInput(raw)).toThrow(HealthImportError);
  });
});
