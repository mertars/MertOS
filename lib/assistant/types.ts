// MertOS Asistan — sunucu (Turso) tarafındaki tabloların TypeScript karşılıkları.
// SQL şeması: lib/server/schema.ts

export type DayType = "kosu" | "yuruyus";
export type MealType = "kahvalti" | "ogle" | "aksam";
export type ScheduleKind = "rutin" | "spor" | "ogun" | "temizlik" | "proje";

/** `routine_log` içine yazılabilen maddeler (bölüm 10.1'deki izinli liste + temizlik). */
export type RoutineItem =
  | "uyanis"
  | "buzlu_su"
  | "hidrasyon"
  | "soguk_dus"
  | "kosu"
  | "yuruyus"
  | "wall_sit"
  | "su"
  | "temizlik";

export interface ScheduleItem {
  id: string;
  time: string;
  kind: ScheduleKind;
  /** "hepsi" = her gün */
  dayType: DayType | "hepsi";
  title: string;
  detail: string | null;
  routineItem: RoutineItem | null;
  mealType: MealType | null;
  sort: number;
}

export interface TodoItem {
  id: number;
  title: string;
  /** YYYY-MM-DD (Türkiye) */
  date: string;
  /** HH:MM ya da gün içinde herhangi bir zaman */
  time: string | null;
  done: boolean;
  /** "ekran" | "sohbet" */
  source: string;
}

export interface RoutineLogRow {
  date: string;
  item: RoutineItem;
  done: boolean;
  updatedAt: string;
}

export interface Meal {
  id: string;
  name: string;
  mealTypes: MealType[];
  durationMin: number;
  difficulty: "kolay" | "orta" | "zor";
  /** ocak | airfryer | mikrodalga — fırın yok */
  equipment: string[];
  steps: string[];
  ingredients: string[];
  /** Kaç öğüne yeter. >1 ise toplu pişirme tarifidir. */
  servings: number;
  /** Kalan porsiyonu ısıtma yöntemi */
  reheat: string | null;
  /** Boş = her gün tipine uygun */
  dayTypes: DayType[];
  tags: string[];
}

export interface MealLogRow {
  id: number;
  date: string;
  mealType: MealType;
  mealId: string | null;
  mealName: string;
  isLeftover: boolean;
  rating: number | null;
  note: string | null;
  repeat: boolean;
  createdAt: string;
}

export interface Chore {
  id: string;
  /** ISO hafta günü; null = her gün */
  weekday: number | null;
  title: string;
  /** Doluysa haftalık rotasyon: ISO hafta numarasına göre sıradaki alan seçilir. */
  rotation: string[] | null;
}
