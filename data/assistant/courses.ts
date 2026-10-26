import type { ClassSession, Course, Exam } from "@/lib/assistant/study";

// Ders ve sınav bilgisi (Bölüm 18) — Mert'in görev dosyasından birebir.
// TEK KAYNAK burası: açılışta Turso'daki `courses`, `class_sessions`, `exams`
// tablolarına yazılır (lib/server/db-core.ts `syncStudy`). Mert bir yazım
// hatası bildirirse burası düzeltilir. Öğrenci numarası / kimlik bilgisi YOK.
// `aliases`: Notlar'dan geriye dönük giriş için ders adının kısa yazımları
// (normalize: küçük harf, Türkçe karakter sadeleştirilmiş).

export const COURSES: Course[] = [
  { id: "BSM3017", name: "Bilgisayar Ağları", aliases: ["bilgisayar aglari", "aglar", "ag"] },
  { id: "BSM2037", name: "Ayrık Matematik", aliases: ["ayrik matematik", "ayrik"] },
  { id: "BSM3007", name: "Veri Madenciliği", aliases: ["veri madenciligi", "madencilik", "vm"] },
  { id: "BSM2033", name: "Devre Teorisi", aliases: ["devre teorisi", "devre"] },
  { id: "BSM3003", name: "Yazılım Mühendisliği", aliases: ["yazilim muhendisligi", "yazilim", "ym"] },
  { id: "BSM2011", name: "İstatistik ve Olasılık Hesapları", aliases: ["istatistik ve olasilik", "istatistik", "olasilik"] },
  { id: "BSM2035", name: "Nesne Yönelimli Programlama", aliases: ["nesne yonelimli programlama", "nesne yonelimli", "nyp", "oop"] },
  { id: "BSM2031", name: "Veri Yapıları ve Algoritmalar", aliases: ["veri yapilari ve algoritmalar", "veri yapilari", "algoritmalar", "algoritma", "vya"] },
];

/** Haftalık ders programı — yalnızca gidilen 3 ders. weekday: 1 = Pazartesi. */
export const CLASS_SESSIONS: ClassSession[] = [
  { id: "BSM3017-pzt", courseId: "BSM3017", weekday: 1, start: "09:00", end: "12:15" },
  { id: "BSM3003-sal", courseId: "BSM3003", weekday: 2, start: "13:15", end: "16:15" },
  { id: "BSM3007-cum", courseId: "BSM3007", weekday: 5, start: "09:30", end: "12:15" },
];

/** Ara sınavlar 3–6 Kasım 2026. Süreleri bilinmiyor (uydurulmaz). */
export const EXAMS: Exam[] = [
  { id: "ara-BSM3017", courseId: "BSM3017", kind: "Ara Sınav", date: "2026-11-03", time: "11:30", weight: 30, rooms: "Derslik 11 (Bilgisayar Lab. I) ve 13 (Bilgisayar Lab. III)" },
  { id: "ara-BSM2037", courseId: "BSM2037", kind: "Ara Sınav", date: "2026-11-03", time: "16:00", weight: 40, rooms: "Derslik 1, 7, 8" },
  { id: "ara-BSM3007", courseId: "BSM3007", kind: "Ara Sınav", date: "2026-11-04", time: "12:00", weight: 40, rooms: "Derslik 11, 13" },
  { id: "ara-BSM2033", courseId: "BSM2033", kind: "Ara Sınav", date: "2026-11-04", time: "16:00", weight: 40, rooms: "Derslik 1" },
  { id: "ara-BSM3003", courseId: "BSM3003", kind: "Ara Sınav", date: "2026-11-05", time: "15:00", weight: 40, rooms: "Derslik 11, 13" },
  { id: "ara-BSM2011", courseId: "BSM2011", kind: "Ara Sınav", date: "2026-11-05", time: "16:00", weight: 40, rooms: "Derslik 1, 7, 8" },
  { id: "ara-BSM2035", courseId: "BSM2035", kind: "Ara Sınav", date: "2026-11-06", time: "11:00", weight: 40, rooms: "Derslik 1" },
  { id: "ara-BSM2031", courseId: "BSM2031", kind: "Ara Sınav", date: "2026-11-06", time: "16:00", weight: 50, rooms: "Derslik 1" },
];
