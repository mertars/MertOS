/** Basit Pearson korelasyon katsayısı hesaplama — saf fonksiyon. */
export function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const xMean = xs.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const yMean = ys.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xMean;
    const dy = ys[i] - yMean;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  if (denom === 0) return null;
  return num / denom;
}

export function describeCorrelation(r: number | null, labelA: string, labelB: string): string {
  if (r == null) return "Henüz yeterli veri yok.";
  const abs = Math.abs(r);
  const strength = abs >= 0.6 ? "güçlü" : abs >= 0.3 ? "orta düzeyde" : "zayıf";
  const direction = r >= 0 ? "arttıkça artıyor" : "arttıkça azalıyor";
  if (abs < 0.15) return `${labelA} ile ${labelB} arasında belirgin bir ilişki görünmüyor.`;
  return `${labelB}, ${labelA} ${direction} — ${strength} bir ilişki (r=${r.toFixed(2)}).`;
}
