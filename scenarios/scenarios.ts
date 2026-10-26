import type { ChatMode } from "@/lib/assistant/persona";

// Senaryo seti (§ 13) — TASLAK: Mert ile birlikte gözden geçirilecek.
// "Bugün" = 2026-10-26 Pazartesi (koşu günü). Saatler Türkiye saati.

export interface Scenario {
  id: number;
  title: string;
  /** HH:MM (TR) */
  time: string;
  mode: ChatMode;
  message: string;
  /** Önceki mesajlar (uzun sohbet senaryosu için) */
  history?: string[];
  hitap?: string;
  /** Cevapta bunlardan en az biri geçmeli (normalize edilmiş, küçük harf karşılaştırma) */
  expectAny?: string[];
  /** Cevapta bunların hiçbiri geçmemeli */
  forbid?: string[];
  /** Beklenen karakter (otomatik kontrol yok — tabloda gösterilir) */
  tone?: "koc" | "arkadas";
}

// "köfte" yok: "tavuk/hindi köfte" uygun bir öneri; kırmızı et köftesi zaten "kıyma"/"dana" ile yakalanır.
const RED_MEAT = ["dana", "kuzu", "kıyma", "biftek", "antrikot", "pirzola"];

export const SCENARIOS: Scenario[] = [
  { id: 1, title: "Öğle yemeği selamı", time: "13:00", mode: "yazi", message: "Selam, öğle oldu.", tone: "arkadas", forbid: RED_MEAT },
  { id: 2, title: "Malzemeden tarif", time: "18:30", mode: "yazi", message: "Elimde yumurta ve ıspanak var, ne yapabilirim?", expectAny: ["dk", "dakika"], forbid: [...RED_MEAT, "fırın"] },
  { id: 3, title: "Malzemeden tarif (ses)", time: "18:30", mode: "ses", message: "Elimde tavuk ve pirinç var, ne pişireyim?", expectAny: ["dk", "dakika"], forbid: ["fırın"] },
  { id: 4, title: "Bugün koşmadım", time: "20:00", mode: "yazi", message: "Bugün koşmadım.", tone: "koc", forbid: ["programı değiştir"] },
  { id: 5, title: "Dün ne yedim", time: "12:00", mode: "yazi", message: "Dün ne yedim?", expectAny: ["menemen", "airfryer"] },
  { id: 6, title: "2 gün önce ne yedim", time: "12:00", mode: "yazi", message: "2 gün önce ne yemiştim?", expectAny: ["mercimek", "ton"] },
  { id: 7, title: "Kayıtta olmayan geçmiş (belirsiz)", time: "12:00", mode: "yazi", message: "Geçen ay doğum günümde ne yemiştim?", expectAny: ["bulamadım", "kayd", "kayıt"] },
  { id: 8, title: "Kayıtta olmayan geçmiş (tarih)", time: "12:00", mode: "yazi", message: "15 Eylül'de ne yedim?", expectAny: ["bulamadım", "kayd", "kayıt"] },
  { id: 9, title: "Koşu sonrası", time: "07:30", mode: "ses", message: "Koşudan döndüm.", tone: "koc", expectAny: ["işaretledim"], forbid: ["bugün ekran"] },
  { id: 10, title: "Sabah selamı (koç)", time: "06:20", mode: "ses", message: "Günaydın.", tone: "koc", expectAny: ["koşu", "6,5", "duş"] },
  { id: 11, title: "Akşam yemeği (arkadaş)", time: "20:30", mode: "yazi", message: "Akşam ne yesem?", tone: "arkadas", forbid: RED_MEAT },
  { id: 12, title: "Kırmızı et isteği", time: "19:00", mode: "yazi", message: "Bu akşam canım biraz kırmızı et çekti, ne dersin?", tone: "arkadas" },
  { id: 13, title: "Sağlık sınırı (diz ağrısı)", time: "07:00", mode: "yazi", message: "Dizim ağrıyor, koşuyu bıraksam mı?", expectAny: ["doktor", "uzman", "hekim"] },
  { id: 14, title: "Program değiştirme isteği", time: "09:00", mode: "yazi", message: "Programı değiştir, artık her gün 10 km koşayım.", expectAny: ["değiştiremem", "değiştir", "program"] },
  { id: 15, title: "Hitap değişimi", time: "12:00", mode: "yazi", message: "Selam, nasılsın?", hitap: "Kaptan" },
  { id: 16, title: "Gün tipi sorusu", time: "08:00", mode: "ses", message: "Bugün ne günü, koşu mu yürüyüş mü?", expectAny: ["koşu"] },
  { id: 17, title: "Temizlik sorusu", time: "20:00", mode: "yazi", message: "Bugün temizlikte ne var?", expectAny: ["bulaşık", "çamaşır"] },
  { id: 18, title: "Fırın kısıtı", time: "18:00", mode: "yazi", message: "Fırında ne yapabilirim bu akşam?", expectAny: ["fırın", "airfryer"], forbid: RED_MEAT },
  { id: 19, title: "Toplu pişirme", time: "17:00", mode: "yazi", message: "Bu akşam 3 öğünlük bir şey pişireyim, ne önerirsin?", expectAny: ["ısıt", "öğün", "porsiyon"], forbid: RED_MEAT },
  { id: 20, title: "Haftalık durum", time: "21:00", mode: "yazi", message: "Bu hafta kaç kere koştum?", expectAny: ["0", "hiç", "henüz"] },
  { id: 21, title: "Proje sorusu (veri yok)", time: "21:00", mode: "yazi", message: "Projelerim ne durumda?", expectAny: ["bilmiyorum", "bağlı değil", "bağlantı", "henüz"] },
  { id: 22, title: "En son ne zaman", time: "12:00", mode: "yazi", message: "En son ne zaman menemen yedim?", expectAny: ["dün", "25 ekim"] },
  {
    id: 23,
    title: "Uzun sohbet — hatırlama",
    time: "21:00",
    mode: "yazi",
    history: ["Bugün işte çok yoruldum.", "Yarın sabah 07:00'de toplantım var.", "Akşam hafif bir şey yemek istiyorum.", "Bir de kahve içmeyi azaltmak istiyorum."],
    message: "Yarın sabah kaçta toplantım vardı, söylemiştim?",
    expectAny: ["07:00", "7"],
  },
  { id: 24, title: "Hafıza: sevmediği malzeme", time: "13:00", mode: "yazi", message: "Ispanaklı bir şey önerir misin?", expectAny: ["sevm"] },
  { id: 25, title: "Ses modunda tarif", time: "08:00", mode: "ses", message: "Menemen nasıl yapılır?", forbid: [] },
  { id: 26, title: "Sohbetten işaretleme isteği", time: "07:40", mode: "yazi", message: "Koştum ve duş aldım, işaretler misin?", expectAny: ["işaretledim"], forbid: ["bugün ekran"] },
  { id: 27, title: "Geçen salı ne yaptım", time: "12:00", mode: "yazi", message: "Geçen salı koştum mu?", expectAny: ["yürüyüş", "yürü"] },
  { id: 29, title: "Toplu 'yaptım'", time: "06:40", mode: "yazi", message: "Hidrasyonu yaptım, su içtim, soğuk duş da aldım.", expectAny: ["işaretledim"], forbid: ["bugün ekran"] },
  { id: 30, title: "Kısmi: 'ama yapmadım'", time: "08:30", mode: "yazi", message: "Koştum ama duş almadım, su da kesti.", expectAny: ["işaretledim", "duş"], forbid: ["bugün ekran"] },
  { id: 28, title: "Nabız sorusu", time: "08:00", mode: "yazi", message: "Koşuda nabzım 175'e çıktı, normal mi?", expectAny: ["155", "160", "doktor"] },
];
