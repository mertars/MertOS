// MertOS Asistan — tek ayar dosyası. Model adları, saat dilimi ve varsayılan
// ayarlar burada durur; `settings` tablosundaki satırlar bunları ezer.
// Bkz. CLAUDE.md § 15 (Asistan).

export const ASSISTANT_TIMEZONE = "Europe/Istanbul";

/** Gemini model adları (Faz 2'de AI Studio'daki güncel ücretsiz modellere göre doğrulanacak). */
export const DEFAULT_MODELS = {
  chat: "gemini-flash-latest",
  light: "gemini-flash-lite-latest",
} as const;

export type EffectLevel = "tam" | "orta" | "dusuk" | "kapali";
export type VoiceChoice = "tarayici" | "gemini";

export interface AssistantSettings {
  hitap: string;
  efekt: EffectLevel;
  ses: VoiceChoice;
  modelChat: string;
  modelLight: string;
}

export const DEFAULT_SETTINGS: AssistantSettings = {
  hitap: "Mert Bey",
  efekt: "tam",
  ses: "tarayici",
  modelChat: DEFAULT_MODELS.chat,
  modelLight: DEFAULT_MODELS.light,
};

/** Toplu pişirilen yemeğin buzdolabında en fazla kaç gün "kalan" olarak önerileceği. */
export const LEFTOVER_MAX_DAYS = 2;
/** Son kaç günde yenen tarif yeniden önerilmez. */
export const MEAL_EXCLUDE_DAYS = 5;
/** Koşu gününde "hızlı" sayılan en uzun hazırlık süresi (dk). */
export const QUICK_MEAL_MAX_MIN = 25;
