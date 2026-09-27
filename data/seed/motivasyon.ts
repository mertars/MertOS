/** Ana ekran selamlamasının altında dönen günlük motivasyon cümleleri (offline, sabit liste). */
export const MOTIVASYON_CUMLELERI = [
  "Bugün de üstüne koy.",
  "Küçük adımlar, büyük seriler yapar.",
  "Formda olmak bir seçim, her gün yeniden.",
  "Nefesin kontrolünde, gerisi kolay.",
  "Bugün bırakmadığın her şey senin.",
  "Disiplin, motivasyon bittiğinde devreye girer.",
  "Dünkü Mert'ten biraz daha iyi ol, yeter.",
  "Zor olan gün, en çok kazandıran gündür.",
  "Bir adım daha. Sonra bir adım daha.",
  "Bugünün hesabı bugün, seri devam ediyor.",
  "Vücudun dinliyor, ne söylediğine dikkat et.",
  "Rahat alan gelişmenin düşmanıdır.",
  "Su iç, nefes al, devam et.",
  "Bugün antrenman yoksa bile temiz kal.",
  "Kondisyon sabırla inşa edilir.",
] as const;

/** Günün tarihine göre sabit (aynı gün içinde değişmeyen) bir cümle seçer. */
export function getDailyMotivasyon(date: Date = new Date()): string {
  const seed = date.getFullYear() * 372 + date.getMonth() * 31 + date.getDate();
  return MOTIVASYON_CUMLELERI[seed % MOTIVASYON_CUMLELERI.length];
}
