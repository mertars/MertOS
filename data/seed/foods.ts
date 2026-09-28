import type { FoodItem } from "@/lib/db/types";

/**
 * Türk mutfağı ağırlıklı gömülü besin veritabanı (150+ öğe).
 * Değerler yaklaşık/gerçekçi USDA + Türkiye besin bileşim referanslarına
 * dayanır — laboratuvar hassasiyeti iddia etmez, günlük takip için yeterlidir.
 *
 * `unit` insan-okunur porsiyon birimidir; `macroPerUnit` TAM O BİRİM için
 * geçerlidir (örn. "100 g" birimi için 100 gramlık değer, "adet" için 1 tane).
 */

type SeedFood = Omit<FoodItem, "id" | "isCustom" | "createdAt">;

const RAW: SeedFood[] = [
  // --- Kahvaltılık ---
  { name: "Yumurta (haşlanmış/sahanda)", unit: "adet", macroPerUnit: { kcal: 78, proteinG: 6.3, carbG: 0.6, fatG: 5.3 } },
  { name: "Süzme yoğurt", unit: "100 g", macroPerUnit: { kcal: 97, proteinG: 9, carbG: 4, fatG: 5 } },
  { name: "Yoğurt (kase)", unit: "kase", macroPerUnit: { kcal: 130, proteinG: 7, carbG: 10, fatG: 6.5 } },
  { name: "Lor peyniri", unit: "100 g", macroPerUnit: { kcal: 98, proteinG: 12, carbG: 3, fatG: 4 } },
  { name: "Beyaz peynir (tam yağlı)", unit: "100 g", macroPerUnit: { kcal: 264, proteinG: 17, carbG: 2, fatG: 21 } },
  { name: "Beyaz peynir (light)", unit: "100 g", macroPerUnit: { kcal: 160, proteinG: 20, carbG: 3, fatG: 8 } },
  { name: "Kaşar peyniri", unit: "100 g", macroPerUnit: { kcal: 350, proteinG: 25, carbG: 2, fatG: 27 } },
  { name: "Tulum peyniri", unit: "100 g", macroPerUnit: { kcal: 320, proteinG: 20, carbG: 1, fatG: 26 } },
  { name: "Zeytin (yeşil)", unit: "100 g", macroPerUnit: { kcal: 145, proteinG: 1, carbG: 4, fatG: 15 } },
  { name: "Zeytin (siyah)", unit: "100 g", macroPerUnit: { kcal: 230, proteinG: 1.5, carbG: 6, fatG: 22 } },
  { name: "Tereyağı", unit: "yemek kaşığı", macroPerUnit: { kcal: 72, proteinG: 0.1, carbG: 0, fatG: 8.1 } },
  { name: "Bal", unit: "yemek kaşığı", macroPerUnit: { kcal: 64, proteinG: 0.1, carbG: 17, fatG: 0 } },
  { name: "Reçel", unit: "yemek kaşığı", macroPerUnit: { kcal: 56, proteinG: 0.1, carbG: 14, fatG: 0 } },
  { name: "Tahin", unit: "yemek kaşığı", macroPerUnit: { kcal: 89, proteinG: 2.6, carbG: 3.2, fatG: 8 } },
  { name: "Pekmez", unit: "yemek kaşığı", macroPerUnit: { kcal: 58, proteinG: 0.2, carbG: 15, fatG: 0 } },
  { name: "Simit", unit: "adet", macroPerUnit: { kcal: 280, proteinG: 8, carbG: 52, fatG: 4 } },
  { name: "Açma", unit: "adet", macroPerUnit: { kcal: 310, proteinG: 6, carbG: 40, fatG: 14 } },
  { name: "Poğaça (peynirli)", unit: "adet", macroPerUnit: { kcal: 260, proteinG: 7, carbG: 30, fatG: 12 } },
  { name: "Tam buğday ekmek", unit: "dilim", macroPerUnit: { kcal: 70, proteinG: 3, carbG: 13, fatG: 1 } },
  { name: "Beyaz ekmek", unit: "dilim", macroPerUnit: { kcal: 80, proteinG: 2.5, carbG: 15, fatG: 1 } },
  { name: "Çavdar ekmeği", unit: "dilim", macroPerUnit: { kcal: 65, proteinG: 2.5, carbG: 12, fatG: 0.8 } },
  { name: "Yulaf ezmesi (kuru)", unit: "100 g", macroPerUnit: { kcal: 379, proteinG: 13, carbG: 67, fatG: 7 } },
  { name: "Granola", unit: "100 g", macroPerUnit: { kcal: 450, proteinG: 10, carbG: 60, fatG: 18 } },
  { name: "Süt (tam yağlı)", unit: "su bardağı", macroPerUnit: { kcal: 122, proteinG: 6.5, carbG: 9.6, fatG: 6.5 } },
  { name: "Süt (yarım yağlı)", unit: "su bardağı", macroPerUnit: { kcal: 100, proteinG: 6.8, carbG: 9.8, fatG: 3.6 } },
  { name: "Badem sütü (şekersiz)", unit: "su bardağı", macroPerUnit: { kcal: 30, proteinG: 1, carbG: 1, fatG: 2.5 } },
  { name: "Ayran", unit: "su bardağı", macroPerUnit: { kcal: 62, proteinG: 3.2, carbG: 4.8, fatG: 3.2 } },
  { name: "Kefir", unit: "su bardağı", macroPerUnit: { kcal: 100, proteinG: 6, carbG: 9, fatG: 4 } },
  { name: "Domates", unit: "adet", macroPerUnit: { kcal: 22, proteinG: 1.1, carbG: 4.8, fatG: 0.2 } },
  { name: "Salatalık", unit: "adet", macroPerUnit: { kcal: 16, proteinG: 0.7, carbG: 3.6, fatG: 0.1 } },
  { name: "Biber (yeşil/kırmızı)", unit: "adet", macroPerUnit: { kcal: 20, proteinG: 0.9, carbG: 4.7, fatG: 0.2 } },
  { name: "Menemen (2 yumurta)", unit: "porsiyon", macroPerUnit: { kcal: 260, proteinG: 15, carbG: 8, fatG: 19 } },

  // --- Protein ana yemek ---
  { name: "Tavuk göğsü (ızgara)", unit: "100 g", macroPerUnit: { kcal: 165, proteinG: 31, carbG: 0, fatG: 3.6 } },
  { name: "Tavuk but (fırın)", unit: "100 g", macroPerUnit: { kcal: 209, proteinG: 26, carbG: 0, fatG: 11 } },
  { name: "Dana kırmızı et (ızgara)", unit: "100 g", macroPerUnit: { kcal: 217, proteinG: 26, carbG: 0, fatG: 12 } },
  { name: "Kıyma (yağsız, pişmiş)", unit: "100 g", macroPerUnit: { kcal: 215, proteinG: 27, carbG: 0, fatG: 11 } },
  { name: "Izgara köfte", unit: "adet", macroPerUnit: { kcal: 85, proteinG: 7, carbG: 1, fatG: 6 } },
  { name: "Ton balığı (suda, süzülmüş)", unit: "100 g", macroPerUnit: { kcal: 116, proteinG: 26, carbG: 0, fatG: 1 } },
  { name: "Somon (ızgara)", unit: "100 g", macroPerUnit: { kcal: 208, proteinG: 20, carbG: 0, fatG: 13 } },
  { name: "Levrek (fırın)", unit: "100 g", macroPerUnit: { kcal: 124, proteinG: 21, carbG: 0, fatG: 4 } },
  { name: "Çipura (fırın)", unit: "100 g", macroPerUnit: { kcal: 121, proteinG: 20, carbG: 0, fatG: 4.5 } },
  { name: "Karides (haşlama)", unit: "100 g", macroPerUnit: { kcal: 99, proteinG: 24, carbG: 0.2, fatG: 0.3 } },
  { name: "Nohut (haşlanmış)", unit: "100 g", macroPerUnit: { kcal: 164, proteinG: 8.9, carbG: 27, fatG: 2.6 } },
  { name: "Kırmızı mercimek (pişmiş)", unit: "100 g", macroPerUnit: { kcal: 116, proteinG: 9, carbG: 20, fatG: 0.4 } },
  { name: "Kuru fasulye (pişmiş)", unit: "100 g", macroPerUnit: { kcal: 127, proteinG: 8.7, carbG: 22, fatG: 0.5 } },
  { name: "Barbunya (pişmiş)", unit: "100 g", macroPerUnit: { kcal: 140, proteinG: 9, carbG: 24, fatG: 0.6 } },
  { name: "Sucuk", unit: "dilim", macroPerUnit: { kcal: 55, proteinG: 3, carbG: 0.3, fatG: 4.6 } },
  { name: "Pastırma", unit: "dilim", macroPerUnit: { kcal: 25, proteinG: 3, carbG: 0.2, fatG: 1.3 } },
  { name: "Hindi göğsü (ızgara)", unit: "100 g", macroPerUnit: { kcal: 135, proteinG: 30, carbG: 0, fatG: 1 } },
  { name: "Sosis (tavuk)", unit: "adet", macroPerUnit: { kcal: 110, proteinG: 6, carbG: 3, fatG: 8 } },
  { name: "Whey protein tozu", unit: "ölçek", macroPerUnit: { kcal: 120, proteinG: 24, carbG: 3, fatG: 1.5 } },

  // --- Karbonhidrat / tahıl ---
  { name: "Pirinç pilavı (pişmiş)", unit: "100 g", macroPerUnit: { kcal: 130, proteinG: 2.4, carbG: 28, fatG: 0.3 } },
  { name: "Bulgur pilavı (pişmiş)", unit: "100 g", macroPerUnit: { kcal: 83, proteinG: 3, carbG: 18, fatG: 0.2 } },
  { name: "Makarna (pişmiş)", unit: "100 g", macroPerUnit: { kcal: 131, proteinG: 5, carbG: 25, fatG: 1.1 } },
  { name: "Patates (haşlanmış)", unit: "100 g", macroPerUnit: { kcal: 87, proteinG: 2, carbG: 20, fatG: 0.1 } },
  { name: "Patates kızartması", unit: "100 g", macroPerUnit: { kcal: 312, proteinG: 3.4, carbG: 41, fatG: 15 } },
  { name: "Tatlı patates (fırın)", unit: "100 g", macroPerUnit: { kcal: 90, proteinG: 2, carbG: 21, fatG: 0.1 } },
  { name: "Kinoa (pişmiş)", unit: "100 g", macroPerUnit: { kcal: 120, proteinG: 4.4, carbG: 21, fatG: 1.9 } },
  { name: "Mısır (haşlanmış)", unit: "100 g", macroPerUnit: { kcal: 96, proteinG: 3.4, carbG: 21, fatG: 1.5 } },
  { name: "Lavaş", unit: "adet", macroPerUnit: { kcal: 220, proteinG: 7, carbG: 42, fatG: 2 } },
  { name: "Yufka", unit: "adet", macroPerUnit: { kcal: 180, proteinG: 5, carbG: 34, fatG: 2 } },
  { name: "Erişte (pişmiş)", unit: "100 g", macroPerUnit: { kcal: 138, proteinG: 4.5, carbG: 25, fatG: 2 } },

  // --- Sebze ---
  { name: "Brokoli (haşlanmış)", unit: "100 g", macroPerUnit: { kcal: 35, proteinG: 2.4, carbG: 7, fatG: 0.4 } },
  { name: "Karnabahar (haşlanmış)", unit: "100 g", macroPerUnit: { kcal: 25, proteinG: 2, carbG: 5, fatG: 0.3 } },
  { name: "Ispanak (kavrulmuş)", unit: "100 g", macroPerUnit: { kcal: 40, proteinG: 3.3, carbG: 4, fatG: 1.5 } },
  { name: "Kabak (kavrulmuş)", unit: "100 g", macroPerUnit: { kcal: 30, proteinG: 1.5, carbG: 5, fatG: 0.6 } },
  { name: "Patlıcan (kavrulmuş)", unit: "100 g", macroPerUnit: { kcal: 35, proteinG: 1, carbG: 6, fatG: 1 } },
  { name: "Havuç (çiğ)", unit: "100 g", macroPerUnit: { kcal: 41, proteinG: 0.9, carbG: 10, fatG: 0.2 } },
  { name: "Taze fasulye (haşlanmış)", unit: "100 g", macroPerUnit: { kcal: 35, proteinG: 2, carbG: 7, fatG: 0.2 } },
  { name: "Bezelye (haşlanmış)", unit: "100 g", macroPerUnit: { kcal: 84, proteinG: 5.4, carbG: 15, fatG: 0.4 } },
  { name: "Mantar (kavrulmuş)", unit: "100 g", macroPerUnit: { kcal: 28, proteinG: 3, carbG: 3, fatG: 0.5 } },
  { name: "Soğan (çiğ)", unit: "100 g", macroPerUnit: { kcal: 40, proteinG: 1.1, carbG: 9, fatG: 0.1 } },
  { name: "Marul", unit: "100 g", macroPerUnit: { kcal: 15, proteinG: 1.4, carbG: 2.9, fatG: 0.2 } },
  { name: "Lahana (çiğ)", unit: "100 g", macroPerUnit: { kcal: 25, proteinG: 1.3, carbG: 6, fatG: 0.1 } },
  { name: "Roka", unit: "100 g", macroPerUnit: { kcal: 25, proteinG: 2.6, carbG: 3.7, fatG: 0.7 } },
  { name: "Semizotu", unit: "100 g", macroPerUnit: { kcal: 16, proteinG: 1.3, carbG: 3.4, fatG: 0.1 } },

  // --- Meyve ---
  { name: "Muz", unit: "adet", macroPerUnit: { kcal: 105, proteinG: 1.3, carbG: 27, fatG: 0.4 } },
  { name: "Elma", unit: "adet", macroPerUnit: { kcal: 95, proteinG: 0.5, carbG: 25, fatG: 0.3 } },
  { name: "Armut", unit: "adet", macroPerUnit: { kcal: 101, proteinG: 0.6, carbG: 27, fatG: 0.2 } },
  { name: "Portakal", unit: "adet", macroPerUnit: { kcal: 62, proteinG: 1.2, carbG: 15, fatG: 0.2 } },
  { name: "Mandalina", unit: "adet", macroPerUnit: { kcal: 47, proteinG: 0.7, carbG: 12, fatG: 0.2 } },
  { name: "Çilek", unit: "100 g", macroPerUnit: { kcal: 32, proteinG: 0.7, carbG: 7.7, fatG: 0.3 } },
  { name: "Üzüm", unit: "100 g", macroPerUnit: { kcal: 69, proteinG: 0.7, carbG: 18, fatG: 0.2 } },
  { name: "Karpuz (dilim)", unit: "dilim", macroPerUnit: { kcal: 86, proteinG: 1.7, carbG: 21, fatG: 0.4 } },
  { name: "Kavun (dilim)", unit: "dilim", macroPerUnit: { kcal: 60, proteinG: 1.5, carbG: 15, fatG: 0.3 } },
  { name: "Şeftali", unit: "adet", macroPerUnit: { kcal: 58, proteinG: 1.4, carbG: 14, fatG: 0.4 } },
  { name: "Kayısı (taze)", unit: "adet", macroPerUnit: { kcal: 17, proteinG: 0.5, carbG: 4, fatG: 0.1 } },
  { name: "İncir (taze)", unit: "adet", macroPerUnit: { kcal: 37, proteinG: 0.4, carbG: 10, fatG: 0.1 } },
  { name: "Kuru incir", unit: "adet", macroPerUnit: { kcal: 47, proteinG: 0.6, carbG: 12, fatG: 0.2 } },
  { name: "Hurma", unit: "adet", macroPerUnit: { kcal: 20, proteinG: 0.2, carbG: 5.3, fatG: 0 } },
  { name: "Kuru üzüm", unit: "yemek kaşığı", macroPerUnit: { kcal: 30, proteinG: 0.3, carbG: 8, fatG: 0 } },
  { name: "Avokado", unit: "adet", macroPerUnit: { kcal: 322, proteinG: 4, carbG: 17, fatG: 29 } },
  { name: "Nar", unit: "adet", macroPerUnit: { kcal: 234, proteinG: 4.7, carbG: 52, fatG: 3.3 } },
  { name: "Kivi", unit: "adet", macroPerUnit: { kcal: 42, proteinG: 0.8, carbG: 10, fatG: 0.4 } },
  { name: "Ananas", unit: "100 g", macroPerUnit: { kcal: 50, proteinG: 0.5, carbG: 13, fatG: 0.1 } },

  // --- Kuruyemiş / yağ ---
  { name: "Ceviz", unit: "adet", macroPerUnit: { kcal: 26, proteinG: 0.6, carbG: 0.6, fatG: 2.6 } },
  { name: "Fındık (10 adet)", unit: "10 adet", macroPerUnit: { kcal: 88, proteinG: 2.1, carbG: 2.3, fatG: 8.5 } },
  { name: "Badem (10 adet)", unit: "10 adet", macroPerUnit: { kcal: 70, proteinG: 2.6, carbG: 2.6, fatG: 6 } },
  { name: "Antep fıstığı", unit: "yemek kaşığı", macroPerUnit: { kcal: 45, proteinG: 1.6, carbG: 2.2, fatG: 3.6 } },
  { name: "Yer fıstığı", unit: "yemek kaşığı", macroPerUnit: { kcal: 52, proteinG: 2.4, carbG: 1.5, fatG: 4.5 } },
  { name: "Fıstık ezmesi", unit: "yemek kaşığı", macroPerUnit: { kcal: 94, proteinG: 4, carbG: 3, fatG: 8 } },
  { name: "Ay çekirdeği (kabuksuz)", unit: "yemek kaşığı", macroPerUnit: { kcal: 52, proteinG: 1.8, carbG: 2, fatG: 4.5 } },
  { name: "Kabak çekirdeği", unit: "yemek kaşığı", macroPerUnit: { kcal: 45, proteinG: 2.4, carbG: 1.5, fatG: 3.8 } },
  { name: "Zeytinyağı", unit: "yemek kaşığı", macroPerUnit: { kcal: 90, proteinG: 0, carbG: 0, fatG: 10 } },
  { name: "Ayçiçek yağı", unit: "yemek kaşığı", macroPerUnit: { kcal: 88, proteinG: 0, carbG: 0, fatG: 10 } },

  // --- İçecek ---
  { name: "Çay (şekersiz)", unit: "bardak", macroPerUnit: { kcal: 2, proteinG: 0, carbG: 0.5, fatG: 0 } },
  { name: "Türk kahvesi (şekersiz)", unit: "fincan", macroPerUnit: { kcal: 5, proteinG: 0.3, carbG: 1, fatG: 0 } },
  { name: "Filtre kahve (sade)", unit: "bardak", macroPerUnit: { kcal: 5, proteinG: 0.3, carbG: 0, fatG: 0 } },
  { name: "Kola", unit: "kutu", macroPerUnit: { kcal: 139, proteinG: 0, carbG: 35, fatG: 0 } },
  { name: "Light kola", unit: "kutu", macroPerUnit: { kcal: 1, proteinG: 0, carbG: 0.3, fatG: 0 } },
  { name: "Meyve suyu (şekerli)", unit: "bardak", macroPerUnit: { kcal: 110, proteinG: 0.5, carbG: 26, fatG: 0.2 } },
  { name: "Enerji içeceği", unit: "kutu", macroPerUnit: { kcal: 115, proteinG: 0, carbG: 28, fatG: 0 } },

  // --- Atıştırmalık / tatlı ---
  { name: "Bisküvi (sade)", unit: "adet", macroPerUnit: { kcal: 35, proteinG: 0.5, carbG: 5.5, fatG: 1.3 } },
  { name: "Kraker", unit: "adet", macroPerUnit: { kcal: 15, proteinG: 0.3, carbG: 2.5, fatG: 0.5 } },
  { name: "Sütlü çikolata bar", unit: "adet", macroPerUnit: { kcal: 210, proteinG: 3, carbG: 24, fatG: 12 } },
  { name: "Bitter çikolata (kare)", unit: "kare", macroPerUnit: { kcal: 27, proteinG: 0.3, carbG: 3, fatG: 1.8 } },
  { name: "Baklava (dilim)", unit: "dilim", macroPerUnit: { kcal: 334, proteinG: 5, carbG: 35, fatG: 20 } },
  { name: "Sütlaç", unit: "kase", macroPerUnit: { kcal: 210, proteinG: 5, carbG: 35, fatG: 5 } },
  { name: "Kazandibi", unit: "dilim", macroPerUnit: { kcal: 240, proteinG: 6, carbG: 34, fatG: 8 } },
  { name: "Dondurma", unit: "top", macroPerUnit: { kcal: 137, proteinG: 2.3, carbG: 16, fatG: 7 } },
  { name: "Patates cipsi", unit: "100 g", macroPerUnit: { kcal: 536, proteinG: 7, carbG: 53, fatG: 35 } },

  // --- Dışarıda / fast-food ---
  { name: "Döner (dürüm)", unit: "adet", macroPerUnit: { kcal: 520, proteinG: 28, carbG: 55, fatG: 20 } },
  { name: "Lahmacun", unit: "adet", macroPerUnit: { kcal: 270, proteinG: 10, carbG: 38, fatG: 9 } },
  { name: "Pide (kaşarlı)", unit: "adet", macroPerUnit: { kcal: 620, proteinG: 24, carbG: 78, fatG: 22 } },
  { name: "Pizza (dilim)", unit: "dilim", macroPerUnit: { kcal: 285, proteinG: 12, carbG: 36, fatG: 10 } },
  { name: "Hamburger", unit: "adet", macroPerUnit: { kcal: 450, proteinG: 22, carbG: 40, fatG: 22 } },
  { name: "Tost (kaşarlı)", unit: "adet", macroPerUnit: { kcal: 320, proteinG: 14, carbG: 34, fatG: 14 } },
  { name: "Mantı (porsiyon)", unit: "porsiyon", macroPerUnit: { kcal: 450, proteinG: 18, carbG: 55, fatG: 16 } },
  { name: "İskender (porsiyon)", unit: "porsiyon", macroPerUnit: { kcal: 780, proteinG: 40, carbG: 60, fatG: 40 } },
  { name: "Çorba (mercimek)", unit: "kase", macroPerUnit: { kcal: 150, proteinG: 8, carbG: 22, fatG: 3.5 } },
  { name: "Çorba (ezogelin)", unit: "kase", macroPerUnit: { kcal: 140, proteinG: 6, carbG: 20, fatG: 3.5 } },
  { name: "Tarhana çorbası", unit: "kase", macroPerUnit: { kcal: 130, proteinG: 5, carbG: 18, fatG: 4 } },
  { name: "Yayla çorbası", unit: "kase", macroPerUnit: { kcal: 145, proteinG: 6, carbG: 14, fatG: 7 } },
  { name: "İşkembe çorbası", unit: "kase", macroPerUnit: { kcal: 220, proteinG: 14, carbG: 8, fatG: 15 } },

  // --- Ev yemekleri / kebap ---
  { name: "Kuzu pirzola (ızgara)", unit: "100 g", macroPerUnit: { kcal: 294, proteinG: 25, carbG: 0, fatG: 21 } },
  { name: "Tavuk kanat (fırın)", unit: "adet", macroPerUnit: { kcal: 99, proteinG: 9, carbG: 0, fatG: 7 } },
  { name: "Balık ekmek", unit: "adet", macroPerUnit: { kcal: 350, proteinG: 22, carbG: 40, fatG: 11 } },
  { name: "Hamsi tava", unit: "100 g", macroPerUnit: { kcal: 210, proteinG: 18, carbG: 8, fatG: 12 } },
  { name: "Karnıyarık", unit: "porsiyon", macroPerUnit: { kcal: 380, proteinG: 16, carbG: 20, fatG: 26 } },
  { name: "İmam bayıldı", unit: "porsiyon", macroPerUnit: { kcal: 210, proteinG: 3, carbG: 18, fatG: 15 } },
  { name: "Türlü (sebze yemeği)", unit: "porsiyon", macroPerUnit: { kcal: 180, proteinG: 4, carbG: 20, fatG: 9 } },
  { name: "Adana kebap", unit: "porsiyon", macroPerUnit: { kcal: 480, proteinG: 26, carbG: 5, fatG: 40 } },
  { name: "Urfa kebap", unit: "porsiyon", macroPerUnit: { kcal: 440, proteinG: 27, carbG: 4, fatG: 35 } },
  { name: "Çiğ köfte (bulgurlu)", unit: "adet", macroPerUnit: { kcal: 45, proteinG: 1, carbG: 8, fatG: 1 } },
  { name: "Humus", unit: "yemek kaşığı", macroPerUnit: { kcal: 35, proteinG: 1.5, carbG: 3, fatG: 2 } },
  { name: "Cacık", unit: "kase", macroPerUnit: { kcal: 90, proteinG: 4, carbG: 5, fatG: 6 } },
  { name: "Haydari", unit: "yemek kaşığı", macroPerUnit: { kcal: 40, proteinG: 2, carbG: 1.5, fatG: 3 } },
  { name: "Piyaz", unit: "porsiyon", macroPerUnit: { kcal: 220, proteinG: 9, carbG: 28, fatG: 8 } },
  { name: "Fava", unit: "porsiyon", macroPerUnit: { kcal: 190, proteinG: 8, carbG: 24, fatG: 7 } },
  { name: "Zeytinyağlı yaprak sarma", unit: "adet", macroPerUnit: { kcal: 35, proteinG: 0.6, carbG: 4, fatG: 2 } },
  { name: "Karışık ızgara (porsiyon)", unit: "porsiyon", macroPerUnit: { kcal: 620, proteinG: 45, carbG: 5, fatG: 46 } },
  { name: "Kuru köfte", unit: "adet", macroPerUnit: { kcal: 95, proteinG: 6, carbG: 4, fatG: 6 } },

  // --- Daha fazla meyve/sebze ---
  { name: "Greyfurt", unit: "adet", macroPerUnit: { kcal: 82, proteinG: 1.6, carbG: 21, fatG: 0.3 } },
  { name: "Erik", unit: "adet", macroPerUnit: { kcal: 30, proteinG: 0.5, carbG: 8, fatG: 0.2 } },
  { name: "Vişne", unit: "100 g", macroPerUnit: { kcal: 50, proteinG: 1, carbG: 12, fatG: 0.3 } },
  { name: "Yaban mersini", unit: "100 g", macroPerUnit: { kcal: 57, proteinG: 0.7, carbG: 14, fatG: 0.3 } },
  { name: "Kuru kayısı", unit: "adet", macroPerUnit: { kcal: 17, proteinG: 0.2, carbG: 4, fatG: 0 } },
  { name: "Pırasa (kavrulmuş)", unit: "100 g", macroPerUnit: { kcal: 40, proteinG: 1.3, carbG: 9, fatG: 0.2 } },
  { name: "Enginar (haşlanmış)", unit: "adet", macroPerUnit: { kcal: 60, proteinG: 4, carbG: 13, fatG: 0.2 } },
  { name: "Bamya (zeytinyağlı)", unit: "100 g", macroPerUnit: { kcal: 75, proteinG: 2, carbG: 8, fatG: 4 } },

  // --- Tatlı / içecek ek ---
  { name: "Trileçe", unit: "dilim", macroPerUnit: { kcal: 290, proteinG: 6, carbG: 38, fatG: 12 } },
  { name: "Künefe", unit: "porsiyon", macroPerUnit: { kcal: 450, proteinG: 10, carbG: 55, fatG: 21 } },
  { name: "Ayva tatlısı", unit: "adet", macroPerUnit: { kcal: 150, proteinG: 0.5, carbG: 35, fatG: 1 } },
  { name: "Kabak tatlısı", unit: "porsiyon", macroPerUnit: { kcal: 210, proteinG: 2, carbG: 45, fatG: 3 } },
  { name: "Kestane (kavrulmuş)", unit: "adet", macroPerUnit: { kcal: 30, proteinG: 0.4, carbG: 6.5, fatG: 0.3 } },
  { name: "Şalgam suyu", unit: "bardak", macroPerUnit: { kcal: 22, proteinG: 0.5, carbG: 5, fatG: 0 } },
  { name: "Boza", unit: "bardak", macroPerUnit: { kcal: 155, proteinG: 1.5, carbG: 35, fatG: 0.3 } },
  { name: "Salep", unit: "bardak", macroPerUnit: { kcal: 160, proteinG: 4, carbG: 26, fatG: 4 } },
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const FOOD_DB: FoodItem[] = RAW.map((f) => ({
  ...f,
  id: `food-${slugify(f.name)}`,
  isCustom: false,
  createdAt: "2025-01-01T00:00:00.000Z",
}));
