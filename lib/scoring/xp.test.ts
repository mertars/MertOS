import { describe, expect, it } from "vitest";
import { computeLevel, cumulativeXpForLevel, xpForDay } from "./xp";

describe("xpForDay", () => {
  it("85 ve üzeri skor için 20 XP verir", () => {
    expect(xpForDay(85)).toBe(20);
    expect(xpForDay(100)).toBe(20);
  });
  it("60-84 arası skor için 10 XP verir", () => {
    expect(xpForDay(60)).toBe(10);
    expect(xpForDay(84)).toBe(10);
  });
  it("60'ın altında XP vermez", () => {
    expect(xpForDay(59)).toBe(0);
    expect(xpForDay(0)).toBe(0);
  });
});

describe("cumulativeXpForLevel", () => {
  it("seviye 0 için 0 döner", () => {
    expect(cumulativeXpForLevel(0)).toBe(0);
  });
  it("üçgensel sayı ile ölçeklenir (her seviye biraz daha zor)", () => {
    expect(cumulativeXpForLevel(1)).toBe(100);
    expect(cumulativeXpForLevel(2)).toBe(300);
    expect(cumulativeXpForLevel(3)).toBe(600);
  });
});

describe("computeLevel", () => {
  it("0 XP'de seviye 0'dır", () => {
    const info = computeLevel(0);
    expect(info.level).toBe(0);
    expect(info.xpIntoLevel).toBe(0);
    expect(info.xpNeededForNextLevel).toBe(100);
    expect(info.progressPercent).toBe(0);
  });
  it("tam seviye eşiğinde bir üst seviyeye geçer", () => {
    const info = computeLevel(100);
    expect(info.level).toBe(1);
    expect(info.xpIntoLevel).toBe(0);
    expect(info.xpNeededForNextLevel).toBe(200);
  });
  it("seviye içi ilerlemeyi doğru yüzdeler", () => {
    const info = computeLevel(150);
    expect(info.level).toBe(1);
    expect(info.xpIntoLevel).toBe(50);
    expect(info.xpNeededForNextLevel).toBe(200);
    expect(info.progressPercent).toBe(25);
  });
  it("bir sonraki eşiğin hemen altında bir üst seviyeye geçmez", () => {
    expect(computeLevel(299).level).toBe(1);
    expect(computeLevel(300).level).toBe(2);
  });
});
