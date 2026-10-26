// MertOS Asistan — tek ayar dosyası. Model adları, saat dilimi ve varsayılan
// ayarlar burada durur; `settings` tablosundaki satırlar bunları ezer.
// Bkz. CLAUDE.md § 15 (Asistan).

export const ASSISTANT_TIMEZONE = "Europe/Istanbul";

/** Gemini model adları (Faz 2'de AI Studio'daki güncel ücretsiz modellere göre doğrulanacak). */
export const DEFAULT_MODELS = {
  chat: "gemini-flash-latest",
  light: "gemini-flash-lite-latest",
} as const;

/**
 * Gemini sesi (Faz 4): ilk model hata/kota verirse sıradaki denenir; ikisi de
 * olmazsa istemci tarayıcının hazır sesine döner. 3.8 modelleri doğrudan WAV,
 * eski önizleme modelleri ham PCM döndürür (lib/server/gemini.ts ikisini de çevirir).
 */
export const TTS_MODELS = ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"] as const;
export const TTS_VOICE = "Kore";
/** Tek seferde seslendirilecek en uzun metin (karakter) — ses modunda cevap zaten 2-3 cümle. */
export const TTS_MAX_CHARS = 600;

export type EffectLevel = "tam" | "orta" | "dusuk" | "kapali";
export type VoiceChoice = "tarayici" | "gemini";
/** Arka plan (Faz 3): ince ışık çizgilerinden dalga yüzeyi ya da cilalı siyahta ışık + toz. */
export type BackgroundChoice = "dalga" | "toz";

export interface AssistantSettings {
  hitap: string;
  efekt: EffectLevel;
  arka: BackgroundChoice;
  ses: VoiceChoice;
  /** Sesle sorulan soruların cevabını ve planlı konuşmaları sesli oku (kapalıysa yalnızca metin). */
  sesliOkuma: boolean;
  /** Program saatlerinde asistan kendiliğinden konuşsun (uygulama açıkken). */
  proaktif: boolean;
  modelChat: string;
  modelLight: string;
}

export const DEFAULT_SETTINGS: AssistantSettings = {
  hitap: "Mert Bey",
  efekt: "tam",
  arka: "dalga",
  ses: "tarayici",
  sesliOkuma: true,
  proaktif: true,
  modelChat: DEFAULT_MODELS.chat,
  modelLight: DEFAULT_MODELS.light,
};

/** Toplu pişirilen yemeğin buzdolabında en fazla kaç gün "kalan" olarak önerileceği. */
export const LEFTOVER_MAX_DAYS = 2;
/** Son kaç günde yenen tarif yeniden önerilmez. */
export const MEAL_EXCLUDE_DAYS = 5;
/** Koşu gününde "hızlı" sayılan en uzun hazırlık süresi (dk). */
export const QUICK_MEAL_MAX_MIN = 25;
