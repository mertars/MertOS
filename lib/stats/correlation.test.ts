import { describe, expect, it } from "vitest";
import { describeCorrelation, pearsonCorrelation } from "./correlation";

describe("pearsonCorrelation", () => {
  it("3'ten az veri noktası için null döner", () => {
    expect(pearsonCorrelation([1, 2], [3, 4])).toBeNull();
  });
  it("mükemmel pozitif ilişki için 1 döner", () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
  });
  it("mükemmel negatif ilişki için -1 döner", () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1);
  });
  it("varyansı olmayan bir dizi için null döner", () => {
    expect(pearsonCorrelation([1, 2, 3], [5, 5, 5])).toBeNull();
  });
  it("ilişkisiz veride 0'a yakın bir değer döner", () => {
    const r = pearsonCorrelation([1, 2, 3, 4], [3, 1, 4, 2]);
    expect(r).not.toBeNull();
    expect(Math.abs(r!)).toBeLessThan(0.6);
  });
});

describe("describeCorrelation", () => {
  it("null ilişki için veri yok mesajı döner", () => {
    expect(describeCorrelation(null, "Uyku", "Ruh Hali")).toBe("Henüz yeterli veri yok.");
  });
  it("çok zayıf ilişki için belirgin bir ilişki olmadığını söyler", () => {
    expect(describeCorrelation(0.05, "Uyku", "Ruh Hali")).toContain("belirgin bir ilişki görünmüyor");
  });
  it("güçlü pozitif ilişkiyi doğru yönde anlatır", () => {
    const text = describeCorrelation(0.75, "Uyku", "Ruh Hali");
    expect(text).toContain("arttıkça artıyor");
    expect(text).toContain("güçlü");
  });
  it("güçlü negatif ilişkiyi doğru yönde anlatır", () => {
    const text = describeCorrelation(-0.75, "Sigara", "Kondisyon Skoru");
    expect(text).toContain("arttıkça azalıyor");
    expect(text).toContain("güçlü");
  });
  it("orta düzeydeki ilişkiyi doğru etiketler", () => {
    const text = describeCorrelation(0.4, "Uyku", "Odak");
    expect(text).toContain("orta düzeyde");
  });
});
