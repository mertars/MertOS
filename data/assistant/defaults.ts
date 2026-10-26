import type { Chore, Meal, ScheduleItem } from "@/lib/assistant/types";

// Varsayılan günlük program ve temizlik tablosu. İlk açılışta (tablo boşsa)
// Turso'ya yazılır; sonrasında veritabanındaki satırlar esas alınır.
// Saatler Mert'in onayına sunuldu (bkz. Faz 1 raporu) — değişirse burası ve
// veritabanı birlikte güncellenir.

export const DEFAULT_SCHEDULE: ScheduleItem[] = [
  { id: "uyanis", time: "06:00", kind: "rutin", dayType: "hepsi", title: "Uyanış", detail: null, routineItem: "uyanis", mealType: null, sort: 10 },
  { id: "buzlu-su", time: "06:05", kind: "rutin", dayType: "hepsi", title: "Buzlu suya yüz", detail: null, routineItem: "buzlu_su", mealType: null, sort: 20 },
  { id: "hidrasyon", time: "06:10", kind: "rutin", dayType: "hepsi", title: "Su içme", detail: null, routineItem: "hidrasyon", mealType: null, sort: 30 },
  { id: "soguk-dus", time: "06:15", kind: "rutin", dayType: "hepsi", title: "Soğuk duş", detail: null, routineItem: "soguk_dus", mealType: null, sort: 40 },
  {
    id: "kosu",
    time: "06:30",
    kind: "spor",
    dayType: "kosu",
    title: "Koşu — 6,5 km",
    detail: "Zone 2 hafif tempo, nabız üst sınırı 155–160",
    routineItem: "kosu",
    mealType: null,
    sort: 50,
  },
  {
    id: "yuruyus",
    time: "06:30",
    kind: "spor",
    dayType: "yuruyus",
    title: "Tempolu yürüyüş — 4 km",
    detail: null,
    routineItem: "yuruyus",
    mealType: null,
    sort: 50,
  },
  { id: "wall-sit", time: "07:20", kind: "spor", dayType: "yuruyus", title: "Duvar oturuşu — 14 dk", detail: "Wall sit", routineItem: "wall_sit", mealType: null, sort: 60 },
  { id: "kahvalti", time: "08:00", kind: "ogun", dayType: "hepsi", title: "Kahvaltı", detail: null, routineItem: null, mealType: "kahvalti", sort: 70 },
  { id: "ogle", time: "13:00", kind: "ogun", dayType: "hepsi", title: "Öğle yemeği", detail: null, routineItem: null, mealType: "ogle", sort: 80 },
  { id: "aksam", time: "19:30", kind: "ogun", dayType: "hepsi", title: "Akşam yemeği", detail: null, routineItem: null, mealType: "aksam", sort: 90 },
  { id: "temizlik", time: "20:30", kind: "temizlik", dayType: "hepsi", title: "Temizlik", detail: null, routineItem: "temizlik", mealType: null, sort: 100 },
  { id: "proje", time: "21:00", kind: "proje", dayType: "hepsi", title: "Proje özeti", detail: null, routineItem: null, mealType: null, sort: 110 },
  { id: "su", time: "21:30", kind: "rutin", dayType: "hepsi", title: "Günlük su hedefi", detail: null, routineItem: "su", mealType: null, sort: 120 },
];

export const DEFAULT_CHORES: Chore[] = [
  { id: "bulasik", weekday: null, title: "Bulaşık", rotation: null },
  { id: "camasir-pzt", weekday: 1, title: "Çamaşır", rotation: null },
  { id: "camasir-per", weekday: 4, title: "Çamaşır", rotation: null },
  { id: "genel-temizlik", weekday: 6, title: "Genel temizlik", rotation: ["Mutfak", "Banyo", "Salon ve oda"] },
];

/**
 * Tarif listesi. Bilinçli olarak BOŞ: görev dosyası § 6 — tarifleri Mert ile
 * kısa bir test turundan sonra birlikte yazıyoruz. Dolunca açılışta
 * `meals` tablosuyla senkronlanır.
 */
export const RECIPES: Meal[] = [];
