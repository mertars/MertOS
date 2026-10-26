import type { Client } from "@libsql/client";
import type { Meal } from "@/lib/assistant/types";
import { addMealLog, setRoutineDone } from "@/lib/server/assistant-repo";
import { addMemory } from "@/lib/server/memory-repo";

// SADECE TEST VERİSİ. Gerçek tarif listesi değildir (o, Mert'in test turundan
// sonra data/assistant/defaults.ts'e yazılacak). Senaryolar "bugün" olarak
// 2026-10-26 Pazartesi'yi (koşu günü) kullanır.

export const FIXTURE_MEALS: Meal[] = [
  { id: "t-menemen", name: "Menemen", mealTypes: ["kahvalti", "ogle"], durationMin: 15, difficulty: "kolay", equipment: ["ocak"], steps: ["Biber ve domatesi kavur.", "Yumurtaları kır, karıştır."], ingredients: ["3 yumurta", "2 domates", "1 biber"], servings: 1, reheat: null, dayTypes: [], tags: ["yumurta"] },
  { id: "t-tavuk-nohut", name: "Tavuklu nohut", mealTypes: ["ogle", "aksam"], durationMin: 45, difficulty: "orta", equipment: ["ocak"], steps: ["Tavuğu sotele.", "Haşlanmış nohutu ekle, 20 dk pişir."], ingredients: ["400 g tavuk göğsü", "2 su bardağı haşlanmış nohut", "salça"], servings: 3, reheat: "mikrodalga", dayTypes: [], tags: ["tavuk", "baklagil", "toplu"] },
  { id: "t-airfryer-tavuk", name: "Airfryer tavuk but", mealTypes: ["aksam"], durationMin: 30, difficulty: "kolay", equipment: ["airfryer"], steps: ["Butları baharatla.", "200 derecede 25 dk."], ingredients: ["4 tavuk but", "baharat"], servings: 2, reheat: "airfryer", dayTypes: [], tags: ["tavuk"] },
  { id: "t-ton-salata", name: "Ton balıklı salata", mealTypes: ["ogle", "aksam"], durationMin: 10, difficulty: "kolay", equipment: [], steps: ["Hepsini karıştır."], ingredients: ["1 kutu ton", "marul", "mısır"], servings: 1, reheat: null, dayTypes: [], tags: ["balik"] },
  { id: "t-mercimek", name: "Mercimek çorbası", mealTypes: ["ogle", "aksam"], durationMin: 35, difficulty: "kolay", equipment: ["ocak"], steps: ["Mercimeği soğanla haşla.", "Blenderdan geçir."], ingredients: ["1 su bardağı kırmızı mercimek", "1 soğan"], servings: 3, reheat: "ocak", dayTypes: [], tags: ["baklagil", "toplu"] },
  { id: "t-yulaf", name: "Muzlu yulaf", mealTypes: ["kahvalti"], durationMin: 5, difficulty: "kolay", equipment: ["mikrodalga"], steps: ["Yulafı sütle mikrodalgada 2 dk ısıt.", "Muz ekle."], ingredients: ["50 g yulaf", "1 muz", "süt"], servings: 1, reheat: null, dayTypes: [], tags: [] },
];

export async function seedFixture(db: Client, fts: boolean) {
  await db.batch(
    FIXTURE_MEALS.map((m) => ({
      sql: `INSERT OR REPLACE INTO meals (id, name, meal_types, duration_min, difficulty, equipment, steps, ingredients, servings, reheat, day_types, tags, active, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [m.id, m.name, JSON.stringify(m.mealTypes), m.durationMin, m.difficulty, JSON.stringify(m.equipment), JSON.stringify(m.steps), JSON.stringify(m.ingredients), m.servings, m.reheat, JSON.stringify(m.dayTypes), JSON.stringify(m.tags), new Date().toISOString()],
    })),
    "write",
  );
  // Öğün kayıtları: ilk kayıt 2026-10-19
  const logs: [string, "kahvalti" | "ogle" | "aksam", string, string, boolean, number | null][] = [
    ["2026-10-19", "ogle", "t-ton-salata", "Ton balıklı salata", false, 3],
    ["2026-10-20", "aksam", "t-mercimek", "Mercimek çorbası", false, 4],
    ["2026-10-23", "aksam", "t-tavuk-nohut", "Tavuklu nohut", false, 5],
    ["2026-10-24", "ogle", "t-mercimek", "Mercimek çorbası", false, 4],
    ["2026-10-24", "aksam", "t-ton-salata", "Ton balıklı salata", false, null],
    ["2026-10-25", "ogle", "t-menemen", "Menemen", false, 5],
    ["2026-10-25", "aksam", "t-airfryer-tavuk", "Airfryer tavuk but", false, 5],
  ];
  for (const [date, mealType, mealId, mealName, isLeftover, rating] of logs) {
    await addMealLog(db, { date, mealType, mealId, mealName, isLeftover, rating });
  }
  // Rutin: geçen hafta + bu sabah (Pazartesi) uyanış ve buzlu su
  const routine: [string, Parameters<typeof setRoutineDone>[2]][] = [
    ["2026-10-20", "yuruyus"],
    ["2026-10-20", "wall_sit"],
    ["2026-10-21", "kosu"],
    ["2026-10-23", "kosu"],
    ["2026-10-25", "kosu"],
    ["2026-10-26", "uyanis"],
    ["2026-10-26", "buzlu_su"],
  ];
  for (const [date, item] of routine) await setRoutineDone(db, date, item, true);
  // Hafıza notları (Mert'in söylemiş olduğu varsayılan)
  for (const text of ["Ispanağı sevmiyor.", "Acılı yemekleri sever.", "Kahvaltıda yulaf yemeyi sever."]) {
    await addMemory(db, { category: "yemek_tercihi", text, sourceConversationId: null, confidence: 1 }, fts);
  }
}
