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

export type ProactiveSlot = "sabah" | "spor" | "kahvalti" | "ogle" | "aksam" | "temizlik" | "proje";

export const PROACTIVE_SLOTS: ProactiveSlot[] = ["sabah", "spor", "kahvalti", "ogle", "aksam", "temizlik", "proje"];

/** Saatinden sonra bu kadar dakika içinde açılan uygulamada konuşulur; daha geç açılırsa o an geçmiş sayılır. */
export const PROACTIVE_WINDOW_MIN = 30;

export interface SlotTime {
  slot: ProactiveSlot;
  time: string;
}

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Bugünün programından konuşma anları: sabah rutini (ilk sabah maddesi), günün sporu, öğünler, temizlik, proje özeti. */
export function slotTimes(brief: Pick<DailyBrief, "schedule">): SlotTime[] {
  const out: SlotTime[] = [];
  const add = (slot: ProactiveSlot, time: string | undefined) => time && !out.some((s) => s.slot === slot) && out.push({ slot, time });
  const s = [...brief.schedule].sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : a.sort - b.sort));
  add("sabah", s.find((x) => x.kind === "rutin" && x.time < "12:00")?.time);
  add("spor", s.find((x) => x.kind === "spor" && (x.routineItem === "kosu" || x.routineItem === "yuruyus"))?.time);
  for (const meal of ["kahvalti", "ogle", "aksam"] as const) add(meal, s.find((x) => x.kind === "ogun" && x.mealType === meal)?.time);
  add("temizlik", s.find((x) => x.kind === "temizlik")?.time);
  add("proje", s.find((x) => x.kind === "proje")?.time);
  return out.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
}

/** O an hâlâ söylenmeye değer mi? (Yapılmış işi hatırlatmaz: koşu işaretliyse, öğün kaydedildiyse…) */
export function slotStillOpen(slot: ProactiveSlot, brief: Pick<DailyBrief, "schedule" | "meals" | "choreDone">): boolean {
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
      return true;
  }
}

/** Şu an saati gelmiş (son 30 dk içinde), söylenmemiş ve hâlâ açık olan an — yoksa null. */
export function dueSlot(brief: Pick<DailyBrief, "schedule" | "meals" | "choreDone">, time: string, spoken: readonly string[]): ProactiveSlot | null {
  const now = toMinutes(time);
  const due = slotTimes(brief).filter((s) => {
    const start = toMinutes(s.time);
    return now >= start && now < start + PROACTIVE_WINDOW_MIN && !spoken.includes(s.slot) && slotStillOpen(s.slot, brief);
  });
  return due.at(-1)?.slot ?? null;
}

/** Sabah ve spor anında disiplinli koç, yemek/temizlik/akşam özetinde arkadaş (görev dosyası § 2). */
export function slotTone(slot: ProactiveSlot): Tone {
  return slot === "sabah" || slot === "spor" ? "koc" : "arkadas";
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
      `Projeler: GitHub bağlantısı henüz yok — proje durumu BİLİNMİYOR, proje hakkında bir şey söyleme, yalnızca bağlanınca burada olacağını söyleyebilirsin.`,
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
      return `Günaydın ${h}. Sabah rutini: ${open.join(", ")}. Sonra ${brief.dayType === "kosu" ? "koşu" : "yürüyüş"} var.`;
    }
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
      return `${h}, günün özeti: rutin ${brief.routine.done}/${brief.routine.total}${open ? `, listede ${open} açık iş var` : ""}. Proje durumu GitHub bağlanınca burada olacak.`;
    }
  }
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
};

export function isProactiveSlot(x: unknown): x is ProactiveSlot {
  return typeof x === "string" && (PROACTIVE_SLOTS as string[]).includes(x);
}
