import { describe, expect, it } from "vitest";
import { isWithinQuietHours, minutesSinceMidnight, shouldFireNow, type FireDecisionInput } from "./scheduler";
import type { NotificationCategorySettings } from "@/lib/db/types";

describe("minutesSinceMidnight", () => {
  it("gece yarısını 0 olarak hesaplar", () => {
    expect(minutesSinceMidnight("00:00")).toBe(0);
  });
  it("saat:dakikayı doğru çevirir", () => {
    expect(minutesSinceMidnight("09:30")).toBe(570);
  });
});

describe("isWithinQuietHours", () => {
  it("aynı başlangıç/bitiş için her zaman false döner", () => {
    expect(isWithinQuietHours("10:00", "08:00", "08:00")).toBe(false);
  });
  it("gece yarısını geçmeyen aralıkta içeride sayar", () => {
    expect(isWithinQuietHours("02:00", "01:00", "05:00")).toBe(true);
  });
  it("gece yarısını geçmeyen aralıkta dışarıda sayar", () => {
    expect(isWithinQuietHours("06:00", "01:00", "05:00")).toBe(false);
  });
  it("gece yarısını geçen aralıkta (23:00-08:00) gece yarısından sonrasını da kapsar", () => {
    expect(isWithinQuietHours("02:00", "23:00", "08:00")).toBe(true);
  });
  it("gece yarısını geçen aralıkta başlangıçtan sonrasını kapsar", () => {
    expect(isWithinQuietHours("23:30", "23:00", "08:00")).toBe(true);
  });
  it("gece yarısını geçen aralıkta gündüz saatini dışarıda bırakır", () => {
    expect(isWithinQuietHours("12:00", "23:00", "08:00")).toBe(false);
  });
});

function baseSettings(overrides: Partial<NotificationCategorySettings> = {}): NotificationCategorySettings {
  return { enabled: true, hours: ["10:00", "15:00", "19:00"], persistence: "normal", templates: ["test"], ...overrides };
}

function baseInput(overrides: Partial<FireDecisionInput> = {}): FireDecisionInput {
  return {
    nowHHMM: "10:00",
    quietHoursStart: "23:00",
    quietHoursEnd: "08:00",
    settings: baseSettings(),
    sentTimesToday: [],
    goalMet: null,
    ...overrides,
  };
}

describe("shouldFireNow", () => {
  it("kategori kapalıysa hiç ateşlenmez", () => {
    expect(shouldFireNow(baseInput({ settings: baseSettings({ enabled: false }) }))).toBe(false);
  });

  it("sessiz saatler içindeyse ateşlenmez", () => {
    expect(shouldFireNow(baseInput({ nowHHMM: "23:30" }))).toBe(false);
  });

  it("yapılandırılmış saatin dışındaysa ateşlenmez", () => {
    expect(shouldFireNow(baseInput({ nowHHMM: "11:00" }))).toBe(false);
  });

  it("tolerans içindeki yakın dakikada ateşlenir", () => {
    expect(shouldFireNow(baseInput({ nowHHMM: "10:02" }))).toBe(true);
  });

  it("aynı saate yakın zaten gönderilmişse tekrar ateşlenmez", () => {
    expect(shouldFireNow(baseInput({ nowHHMM: "10:01", sentTimesToday: ["10:00"] }))).toBe(false);
  });

  describe("sakin ısrar düzeyi", () => {
    it("gün içinde ilk yapılandırılmış saatte ateşlenir", () => {
      expect(shouldFireNow(baseInput({ settings: baseSettings({ persistence: "sakin" }) }))).toBe(true);
    });
    it("gün içinde bir kez gönderildiyse başka bir yapılandırılmış saatte bile ateşlenmez", () => {
      const input = baseInput({ nowHHMM: "15:00", settings: baseSettings({ persistence: "sakin" }), sentTimesToday: ["10:00"] });
      expect(shouldFireNow(input)).toBe(false);
    });
  });

  describe("normal ısrar düzeyi", () => {
    it("her yapılandırılmış saatte, günlük saat sayısına kadar ateşlenir", () => {
      const input = baseInput({ nowHHMM: "15:00", sentTimesToday: ["10:00"] });
      expect(shouldFireNow(input)).toBe(true);
    });
    it("tüm yapılandırılmış saatler için zaten gönderildiyse tekrar ateşlenmez", () => {
      const input = baseInput({ nowHHMM: "19:00", sentTimesToday: ["10:00", "15:00", "19:00"] });
      expect(shouldFireNow(input)).toBe(false);
    });
  });

  describe("israrci ısrar düzeyi", () => {
    it("hedef zaten tutturulduysa ateşlenmez", () => {
      const input = baseInput({ settings: baseSettings({ persistence: "israrci" }), goalMet: true });
      expect(shouldFireNow(input)).toBe(false);
    });
    it("yapılandırılmış saatte hedef tutmadıysa ateşlenir", () => {
      const input = baseInput({ settings: baseSettings({ persistence: "israrci" }), goalMet: false });
      expect(shouldFireNow(input)).toBe(true);
    });
    it("yapılandırılmış saat dışında, son gönderimden ISRARCI_REPEAT_HOURS saat geçtiyse tekrar ateşlenir", () => {
      const input = baseInput({
        nowHHMM: "12:00",
        settings: baseSettings({ persistence: "israrci" }),
        goalMet: false,
        sentTimesToday: ["10:00"],
      });
      expect(shouldFireNow(input)).toBe(true);
    });
    it("son gönderimden yeterli süre geçmediyse tekrar ateşlenmez", () => {
      const input = baseInput({
        nowHHMM: "11:00",
        settings: baseSettings({ persistence: "israrci" }),
        goalMet: false,
        sentTimesToday: ["10:00"],
      });
      expect(shouldFireNow(input)).toBe(false);
    });
    it("günlük üst sınıra ulaşıldıysa tekrar ateşlenmez", () => {
      const input = baseInput({
        nowHHMM: "23:00",
        quietHoursStart: "23:30",
        settings: baseSettings({ persistence: "israrci" }),
        goalMet: false,
        sentTimesToday: ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"],
      });
      expect(shouldFireNow(input)).toBe(false);
    });
  });
});
