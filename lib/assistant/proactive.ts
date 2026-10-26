import type { DailyBrief } from "./daily";
import { MEAL_TYPE_LABELS } from "./meals";
import { usesFormalYou, type Tone } from "./persona";
import { formatTrDate } from "./text";
import { addDays } from "./time";
import type { MealLogRow } from "./types";

// Planlı konuşma (Faz 4 § 2) — LLM'siz kısım. Program saatleri `schedule_items`
// tablosundan (günlük özetin `schedule`'ı) gelir; uygulama AÇIKKEN saat
// gelince asistan kendiliğinden konuşur. Hangi anın geldiğine, o anla ilgili
// gerçek verilere ve model ulaşılamazsa söylenecek cümleye KOD karar verir;
// model yalnızca cümleyi kurar (lib/server/proactive.ts).

export type ProactiveSlot = "sabah" | "spor" | "kahvalti" | "ogle" | "aksam" | "temizlik" | "proje" | "ders" | "sinav" | "sinav-aksam";

export const PROACTIVE_SLOTS: ProactiveSlot[] = ["sabah", "spor", "kahvalti", "ogle", "aksam", "temizlik", "proje", "ders", "sinav", "sinav-aksam"];

/**
 * Ders/sınav anları (Bölüm 18): cümle TAMAMEN koddan — model çağrılmaz (derslik
 * modele gitmez, saat/derslik yanlış söylenemez).
 */
export const CODE_ONLY_SLOTS: ProactiveSlot[] = ["ders", "sinav", "sinav-aksam"];
/** Sınav sabahı mesajının saati; ders hatırlatması dersten bu kadar dakika önce. */
export const EXAM_MORNING_TIME = "07:30";
export const EXAM_EVE_TIME = "21:30";
export const CLASS_REMINDER_MIN = 30;

/** Saatinden sonra bu kadar dakika içinde açılan uygulamada konuşulur; daha geç açılırsa o an geçmiş sayılır. */
export const PROACTIVE_WINDOW_MIN = 30;

export interface SlotTime {
  slot: ProactiveSlot;
  time: string;
  /** Pencerenin sonu (yoksa saat + 30 dk): sınav sabahı ilk sınava kadar, ders hatırlatması ders başına kadar */
  until?: string;
}

type SlotBrief = Pick<DailyBrief, "schedule" | "meals" | "choreDone" | "study">;

const fromMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Bugünün programından konuşma anları: sabah rutini (ilk sabah maddesi), günün sporu, öğünler, temizlik, proje özeti. */
export function slotTimes(brief: Pick<DailyBrief, "schedule" | "study">): SlotTime[] {
  const out: SlotTime[] = [];
  const add = (slot: ProactiveSlot, time: string | undefined, until?: string) => time && !out.some((s) => s.slot === slot) && out.push({ slot, time, until });
  const s = [...brief.schedule].sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : a.sort - b.sort));
  add("sabah", s.find((x) => x.kind === "rutin" && x.time < "12:00")?.time);
  add("spor", s.find((x) => x.kind === "spor" && (x.routineItem === "kosu" || x.routineItem === "yuruyus"))?.time);
  for (const meal of ["kahvalti", "ogle", "aksam"] as const) add(meal, s.find((x) => x.kind === "ogun" && x.mealType === meal)?.time);
  add("temizlik", s.find((x) => x.kind === "temizlik")?.time);
  add("proje", s.find((x) => x.kind === "proje")?.time);
  const st = brief.study;
  if (st) {
    const firstClass = st.classes.find((c) => !c.attended);
    if (firstClass && st.remindClasses) add("ders", fromMinutes(Math.max(0, toMinutes(firstClass.start) - CLASS_REMINDER_MIN)), firstClass.start);
    if (st.examsToday.length) add("sinav", EXAM_MORNING_TIME, st.examsToday[0].time > EXAM_MORNING_TIME ? st.examsToday[0].time : undefined);
    if (st.examsTomorrow.length) add("sinav-aksam", EXAM_EVE_TIME, "23:59");
  }
  return out.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
}

/** O an hâlâ söylenmeye değer mi? (Yapılmış işi hatırlatmaz: koşu işaretliyse, öğün kaydedildiyse…) */
export function slotStillOpen(slot: ProactiveSlot, brief: SlotBrief): boolean {
  switch (slot) {
    case "sabah":
      return brief.schedule.some((x) => x.kind === "rutin" && x.time < "12:00" && x.done === false);
    case "spor":
      return brief.schedule.some((x) => x.kind === "spor" && (x.routineItem === "kosu" || x.routineItem === "yuruyus") && x.done === false);
    case "kahvalti":
    case "ogle":
    case "aksam":
      return !brief.meals.find((m) => m.mealType === slot)?.logged;
    case "temizlik":
      return !brief.choreDone;
    case "proje":
    case "sinav":
    case "sinav-aksam":
      return true;
    case "ders":
      return Boolean(brief.study?.classes.some((c) => !c.attended));
  }
}

/** Şu an saati gelmiş (son 30 dk içinde), söylenmemiş ve hâlâ açık olan an — yoksa null. */
export function dueSlot(brief: SlotBrief, time: string, spoken: readonly string[]): ProactiveSlot | null {
  const now = toMinutes(time);
  const due = slotTimes(brief).filter((s) => {
    const start = toMinutes(s.time);
    const end = s.until ? Math.max(toMinutes(s.until), start + PROACTIVE_WINDOW_MIN) : start + PROACTIVE_WINDOW_MIN;
    return now >= start && now < end && !spoken.includes(s.slot) && slotStillOpen(s.slot, brief);
  });
  return due.at(-1)?.slot ?? null;
}

/** Sabah ve spor anında disiplinli koç, yemek/temizlik/akşam özetinde arkadaş (görev dosyası § 2). */
export function slotTone(slot: ProactiveSlot): Tone {
  return slot === "sabah" || slot === "spor" || slot === "ders" || slot === "sinav" ? "koc" : "arkadas";
}

const lowerFirst = (s: string) => s.charAt(0).toLocaleLowerCase("tr-TR") + s.slice(1);

/** Önerilen yemeğin daha önceki kaydı: "en son 22 Ekim'de yediniz, puan 5/5" — yoksa "önceki kaydı yok". */
function mealHistoryLine(mealId: string, log: MealLogRow[], today: string): string {
  const past = log.filter((r) => r.mealId === mealId && r.date < today && !r.isLeftover).sort((a, b) => (a.date < b.date ? -1 : 1));
  const last = past.at(-1);
  if (!last) return "Bu yemeğin önceki kaydı yok (ilk kez önerilecek).";
  const rated = past.filter((r) => r.rating != null).at(-1);
  return [
    `Bu yemek en son ${formatTrDate(last.date)} (${last.date}) yendi.`,
    rated ? `Verilen puan: ${rated.rating}/5 (${formatTrDate(rated.date)}).` : "Puan verilmemiş.",
    last.repeat ? `Mert "tekrar yap" demişti.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Konuşma anının gerçek verileri — model YALNIZCA bunlardan cümle kurar.
 * `mealLog`: son ~60 günün öğün kayıtları (önerilen yemeğin geçmiş puanı için).
 */
export function buildProactiveFacts(slot: ProactiveSlot, brief: DailyBrief, mealLog: MealLogRow[]): string {
  const head = `Şu an: ${formatTrDate(brief.date)} ${brief.weekdayName} (${brief.date}), saat ${brief.time}. ${brief.dayTypeLabel}.`;
  const w = brief.week;
  const week = `Bu hafta: koşu ${w.runs.done}/${w.runs.planned}, yürüyüş ${w.walks.done}/${w.walks.planned}, rutin %${w.routinePct}.`;
  const lines: string[] = [head];

  if (slot === "sabah") {
    const morning = brief.schedule.filter((x) => x.kind === "rutin" && x.time < "12:00");
    const open = morning.filter((x) => !x.done).map((x) => x.title);
    const done = morning.filter((x) => x.done).map((x) => x.title);
    const sport = brief.schedule.find((x) => x.kind === "spor" && (x.routineItem === "kosu" || x.routineItem === "yuruyus"));
    lines.push(`An: sabah rutini.`, `Sıradaki rutin maddeleri: ${open.join(", ") || "yok"}.`, done.length ? `Zaten yapılan: ${done.join(", ")}.` : "");
    if (sport) lines.push(`Ardından ${sport.time} ${sport.title}${sport.done ? " (yapıldı)" : ""}.`);
    lines.push(week);
    // Bölüm 18: sabah özetinde bugünkü ders ve blok hedefi (derslik yok).
    const study = studyMorningLine(brief);
    if (study) lines.push(study);
  } else if (CODE_ONLY_SLOTS.includes(slot)) {
    lines.push(fallbackProactiveText(slot, brief));
  } else if (slot === "spor") {
    const extra = brief.schedule.filter((x) => x.kind === "spor" && x.routineItem === "wall_sit").map((x) => `${x.time} ${x.title}`);
    lines.push(`An: ${brief.dayType === "kosu" ? "koşu" : "yürüyüş"} vakti.`, `Plan: ${brief.plan}.`, extra.length ? `Sonra: ${extra.join(", ")}.` : "", week);
  } else if (slot === "kahvalti" || slot === "ogle" || slot === "aksam") {
    const meal = brief.meals.find((m) => m.mealType === slot)!;
    const s = meal.suggestion;
    lines.push(`An: ${lowerFirst(meal.label)} vakti.`);
    if (s.kind === "kalan") {
      lines.push(`Öneri: kalan ${s.meal.name} — pişirme ${formatTrDate(s.cookedOn)} (${s.cookedOn}), ${s.remaining} porsiyon kaldı${s.meal.reheat ? `, ısıtma: ${s.meal.reheat}` : ""}.`);
      // Kalan porsiyonun pişirildiği günün kaydı (puanı) da dahil.
      lines.push(mealHistoryLine(s.meal.id, mealLog, addDays(s.cookedOn, 1)));
    } else if (s.kind === "yeni") {
      lines.push(`Öneri: ${s.meal.name} — ${s.meal.durationMin} dk, ${s.meal.difficulty}${s.meal.servings > 1 ? `, ${s.meal.servings} öğüne yeter` : ""} (${s.meal.equipment.join(", ")}).`);
      lines.push(mealHistoryLine(s.meal.id, mealLog, brief.date));
    } else {
      lines.push(`Öneri yok: ${s.reason}. Belirli bir yemek ADI SÖYLEME; ne yemek istediğini sor ya da elindeki malzemeyi sor.`);
    }
  } else if (slot === "temizlik") {
    lines.push(`An: temizlik vakti.`, `Bugünkü işler: ${brief.chores.map((c) => c.title).join(", ") || "yok"}.`);
  } else {
    const todos = brief.todos ?? [];
    const open = todos.filter((t) => !t.done).map((t) => `${t.time ?? "gün içinde"} ${t.title}`);
    lines.push(
      `An: günün kısa özeti (proje özeti saati).`,
      projectsFactLine(brief),
      `Bugün rutin ${brief.routine.done}/${brief.routine.total}.`,
      `Yapılacaklar: ${todos.length ? `${todos.length - open.length}/${todos.length} yapıldı${open.length ? `; açık: ${open.join(", ")}` : ""}` : "liste boş"}.`,
    );
  }
  return lines.filter(Boolean).join("\n");
}

/** Model ulaşılamazsa ya da cevabı kontrolden geçmezse söylenecek, tamamen koddan cümle. */
export function fallbackProactiveText(slot: ProactiveSlot, brief: DailyBrief): string {
  const h = brief.hitap;
  switch (slot) {
    case "sabah": {
      const open = brief.schedule.filter((x) => x.kind === "rutin" && x.time < "12:00" && !x.done).map((x) => lowerFirst(x.title));
      const study = studyMorningLine(brief);
      return `Günaydın ${h}. Sabah rutini: ${open.join(", ")}. Sonra ${brief.dayType === "kosu" ? "koşu" : "yürüyüş"} var.${study ? ` ${study}` : ""}`;
    }
    case "ders": {
      const c = brief.study?.classes.find((x) => !x.attended);
      return c ? `${h}, ders saati yaklaşıyor: ${c.start}–${c.end} ${c.name}.` : `${h}, bugün ders yok.`;
    }
    case "sinav":
      return `${h}, bugün sınav günü: ${examList(brief.study?.examsToday ?? [])}. Başarılar!`;
    case "sinav-aksam":
      return `${h}, yarın sınav var: ${examList(brief.study?.examsTomorrow ?? [])}. Erken yatmak iyi gelir.`;
    case "spor":
      return `${h}, ${brief.dayType === "kosu" ? "koşu" : "yürüyüş"} vakti: ${brief.plan}.`;
    case "kahvalti":
    case "ogle":
    case "aksam": {
      const meal = brief.meals.find((m) => m.mealType === slot)!;
      const s = meal.suggestion;
      const what =
        s.kind === "kalan"
          ? ` Kalan ${lowerFirst(s.meal.name)} var${s.meal.reheat ? `, ${s.meal.reheat}` : ""}.`
          : s.kind === "yeni"
            ? ` Öneri: ${lowerFirst(s.meal.name)}, ${s.meal.durationMin} dakika.`
            : usesFormalYou(h)
              ? " Ne yemek istersiniz?"
              : " Ne yemek istersin?";
      return `${h}, ${lowerFirst(meal.label)} vakti.${what}`;
    }
    case "temizlik":
      return `${h}, temizlik vakti: ${brief.chores.map((c) => lowerFirst(c.title)).join(", ")}.`;
    case "proje": {
      const open = (brief.todos ?? []).filter((t) => !t.done).length;
      return `${h}, günün özeti: rutin ${brief.routine.done}/${brief.routine.total}${open ? `, listede ${open} açık iş var` : ""}. ${projectsSentence(brief)}`;
    }
  }
}

const dayLabel = (iso: string | null) => (iso ? formatTrDate(iso.slice(0, 10)) : "?");

/** Proje bölümü, model için gerçek veri satırı (yalnızca ad, sayılar, tarih — başlık/içerik yok). */
function projectsFactLine(brief: Pick<DailyBrief, "projects">): string {
  const p = brief.projects;
  if (!p || p.status === "bagli-degil") return "Projeler: GitHub bağlantısı yok — proje durumu BİLİNMİYOR, proje hakkında bir şey söyleme.";
  if (p.status === "secim-yok") return "Projeler: izlenen proje seçilmemiş — proje durumu BİLİNMİYOR, proje hakkında bir şey söyleme.";
  return `Projeler (GitHub'daki son duruma göre; "GitHub'daki son duruma göre" ifadesini kullan): ${p.items
    .map((i) => `${i.name}: ${i.open} açık iş, ${i.waiting} dal testte bekliyor${i.failed ? `, ${i.failed} dalın testi kaldı` : ""}, ${dayLabel(i.updatedAt)} tarihinde okundu${i.stale ? " (ESKİ — GitHub'a ulaşılamadı)" : ""}`)
    .join("; ")}.`;
}

function projectsSentence(brief: Pick<DailyBrief, "projects">): string {
  const p = brief.projects;
  if (!p || p.status !== "hazir") return "Proje durumu için GitHub bağlantısı/seçimi Projeler sekmesinde.";
  return `GitHub'daki son duruma göre: ${p.items.map((i) => `${i.name} ${i.open} açık iş${i.waiting ? `, ${i.waiting} dal testte bekliyor` : ""}${i.failed ? `, ${i.failed} dalın testi kaldı` : ""} (${dayLabel(i.updatedAt)}${i.stale ? ", eski" : ""})`).join("; ")}.`;
}

/** "11:30 Bilgisayar Ağları — Derslik 11 ve 13; 16:00 Ayrık Matematik — Derslik 1, 7, 8" (koddan; modele gitmez) */
function examList(exams: { name: string; time: string; rooms: string }[]): string {
  return exams.map((e) => `${e.time} ${e.name} — ${e.rooms}`).join("; ");
}

/** "Bugün 13:15–16:15 Yazılım Mühendisliği dersi var. Çalışma hedefi 8 blok." — derslik yok, yalnızca ad ve blok. */
export function studyMorningLine(brief: Pick<DailyBrief, "study">): string {
  const st = brief.study;
  if (!st) return "";
  const parts: string[] = [];
  if (st.classes.length && st.remindClasses) parts.push(`Bugün ${st.classes.map((c) => `${c.start}–${c.end} ${c.name}`).join(", ")} dersi var.`);
  if (st.examsToday.length) parts.push(`Bugün sınav: ${st.examsToday.map((e) => `${e.time} ${e.name}`).join(", ")}.`);
  if (st.blockTarget > 0) parts.push(`Çalışma hedefi ${st.blockTarget} blok.`);
  return parts.join(" ");
}

/** Ekranda ve kayıtta görünen kısa ad: "Öğle vakti", "Sabah rutini"… */
export const SLOT_LABELS: Record<ProactiveSlot, string> = {
  sabah: "Sabah rutini",
  spor: "Spor vakti",
  kahvalti: `${MEAL_TYPE_LABELS.kahvalti} vakti`,
  ogle: `${MEAL_TYPE_LABELS.ogle} vakti`,
  aksam: `${MEAL_TYPE_LABELS.aksam} vakti`,
  temizlik: "Temizlik vakti",
  proje: "Günün özeti",
  ders: "Ders hatırlatması",
  sinav: "Sınav günü",
  "sinav-aksam": "Yarınki sınav",
};

export function isProactiveSlot(x: unknown): x is ProactiveSlot {
  return typeof x === "string" && (PROACTIVE_SLOTS as string[]).includes(x);
}
