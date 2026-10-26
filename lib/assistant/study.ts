import { normalizeTr, formatTrDate, TR_MONTHS } from "./text";
import { addDays, daysBetween, isoWeekday } from "./time";

// Ders ve sınav takibi (Bölüm 18) — tamamen deterministik, LLM yok.
// Plan: bugünden her sınava kadar günlük blok hedefi (1 blok = ayardaki dakika,
// varsayılan 50). Kurallar:
// - Bir dersin toplam hedefi ağırlıkla ve düşük hazırlık puanıyla büyür.
// - Kalan blok, sınava kalan çalışma günlerine bölünür → gün azaldıkça günlük hedef büyür.
// - Günlük toplam, Mert'in sınırını (varsayılan 8) geçmez; sınav günü yarısı.
// - Yapılmayan bloklar kendiliğinden sonraki günlere kayar (plan her gün baştan hesaplanır).
// - Sığmıyorsa dürüstçe söylenir: "bu hızla X hedefin altında kalır".
// Plan blok SAYISI verir, saat vermez — koşu/yürüyüş ve öğün saatlerine dokunmaz.

export interface Course {
  /** Ders kodu (BSM3017) */
  id: string;
  name: string;
  /** Notlar'dan içe aktarırken tanınacak kısa yazımlar (normalize) */
  aliases: string[];
}

export interface ClassSession {
  id: string;
  courseId: string;
  /** ISO hafta günü, 1 = Pazartesi */
  weekday: number;
  start: string;
  end: string;
}

export interface Exam {
  id: string;
  courseId: string;
  kind: string;
  date: string;
  time: string;
  /** Yüzde */
  weight: number;
  /** Derslik — yalnızca ekranda ve koddan kurulan sınav sabahı mesajında; modele GİTMEZ */
  rooms: string;
}

export interface StudyBlock {
  id: number;
  date: string;
  courseId: string;
  blocks: number;
  note: string | null;
  source: string;
  createdAt: string;
}

export interface ReadinessEntry {
  courseId: string;
  score: number;
  date: string;
}

/** %40 ağırlıklı, hazırlığı orta (3) bir sınav için toplam hedef blok. */
export const BASE_BLOCKS = 10;
/** Puan verilmemiş ders orta (3) sayılır — ekranda "puan verin" denir. */
export const DEFAULT_READINESS = 3;

/** Dersin sınava kadarki toplam hedefi: ağırlık arttıkça ve hazırlık düştükçe büyür (en az 2). */
export function targetBlocks(weight: number, readiness: number): number {
  const r = Math.max(1, Math.min(5, readiness));
  return Math.max(2, Math.round(BASE_BLOCKS * (weight / 40) * ((6 - r) / 3)));
}

export interface CoursePlan {
  courseId: string;
  name: string;
  exam: Exam;
  readiness: number;
  /** Mert puan verdi mi (vermediyse orta sayıldı) */
  rated: boolean;
  /** Toplam hedef blok */
  target: number;
  /** Sınav gününe kadar yapılan (bugün dahil) */
  done: number;
  doneToday: number;
  /** Bugünün hedefi (bugün öncesindeki eksiğe göre) */
  todayTarget: number;
  /** Bugünden sınava gün gün planlanan */
  daily: { date: string; blocks: number }[];
  /** Plan sığmazsa sınava kadar eksik kalacak blok */
  shortfall: number;
  /** Sınav geçti mi (bugünden önce) */
  past: boolean;
}

export interface StudyPlan {
  today: string;
  cap: number;
  courses: CoursePlan[];
  todayTarget: number;
  todayDone: number;
  /** Bugün ve sonraki günlerin toplamları (yalnızca sınavı geçmemiş dersler) */
  days: { date: string; total: number; cap: number }[];
  /** Dürüst uyarılar ("bu hızla … hedefin altında kalır") */
  warnings: string[];
}

const examKey = (e: Exam) => `${e.date} ${e.time}`;

/** Sınav günü yalnızca o günden sonraki sınavlara çalışılır, sınır yarıya iner. */
function dayCap(date: string, exams: Exam[], cap: number): number {
  return exams.some((e) => e.date === date) ? Math.floor(cap / 2) : cap;
}

function allocate(
  today: string,
  rem: Map<string, number>,
  active: Exam[],
  cap: number,
  topUp: boolean,
): { perCourse: Map<string, Map<string, number>>; left: Map<string, number> } {
  const left = new Map(rem);
  const perCourse = new Map<string, Map<string, number>>(active.map((e) => [e.courseId, new Map()]));
  const last = active.reduce((m, e) => (e.date > m ? e.date : m), today);
  const byDeadline = [...active].sort((a, b) => (examKey(a) < examKey(b) ? -1 : 1));
  for (let d = today; d < last; d = addDays(d, 1)) {
    let room = dayCap(d, active, cap);
    const eligible = byDeadline.filter((e) => e.date > d && (left.get(e.courseId) ?? 0) > 0);
    // 1) Herkese payı: kalan / sınava kalan gün. Toplam sığmıyorsa paylar oranla küçülür
    //    (en yakın sınav önce) — hiçbir ders sıfırda kalmasın, eksik derslere yayılsın.
    const want = eligible.map((e) => ({ e, share: left.get(e.courseId)! / daysBetween(d, e.date) }));
    const total = want.reduce((s, w) => s + w.share, 0);
    const scale = total > room ? room / total : 1;
    const gives = want.map((w) => {
      const exact = w.share * scale;
      const base = scale < 1 ? Math.floor(exact) : Math.ceil(exact);
      return { ...w, give: Math.min(base, left.get(w.e.courseId)!), frac: exact - Math.floor(exact) };
    });
    let spare = room - gives.reduce((s, g) => s + g.give, 0);
    if (scale < 1) {
      for (const g of [...gives].sort((a, b) => b.frac - a.frac)) {
        if (spare <= 0) break;
        if (g.give < left.get(g.e.courseId)!) {
          g.give++;
          spare--;
        }
      }
    }
    for (const g of gives) {
      const give = Math.max(0, Math.min(g.give, room));
      if (give <= 0) continue;
      perCourse.get(g.e.courseId)!.set(d, give);
      left.set(g.e.courseId, left.get(g.e.courseId)! - give);
      room -= give;
    }
    // 2) Sığmayan varsa: boş kapasite yakın sınavdan başlayarak öne çekilir.
    if (topUp) {
      for (const e of eligible) {
        if (room <= 0) break;
        const r = left.get(e.courseId)!;
        const give = Math.min(room, r);
        if (give <= 0) continue;
        const m = perCourse.get(e.courseId)!;
        m.set(d, (m.get(d) ?? 0) + give);
        left.set(e.courseId, r - give);
        room -= give;
      }
    }
  }
  return { perCourse, left };
}

export function buildStudyPlan(params: {
  today: string;
  courses: Course[];
  exams: Exam[];
  blocks: StudyBlock[];
  readiness: ReadinessEntry[];
  /** Günlük toplam blok üst sınırı (ayar, varsayılan 8) */
  cap: number;
}): StudyPlan {
  const { today, cap } = params;
  const names = new Map(params.courses.map((c) => [c.id, c.name]));
  const latestReadiness = new Map<string, ReadinessEntry>();
  for (const r of [...params.readiness].sort((a, b) => (a.date < b.date ? -1 : 1))) latestReadiness.set(r.courseId, r);

  const exams = [...params.exams].sort((a, b) => (examKey(a) < examKey(b) ? -1 : 1));
  // Bugün ve sonrası sınavı olanlara çalışılır; sınav günü o derse artık çalışılmaz (plan dışı).
  const studyable = exams.filter((e) => e.date > today);

  const doneFor = (e: Exam, upTo: (d: string) => boolean) =>
    params.blocks.filter((b) => b.courseId === e.courseId && b.date <= e.date && upTo(b.date)).reduce((s, b) => s + b.blocks, 0);

  const base = exams.map((e) => {
    const r = latestReadiness.get(e.courseId);
    const readiness = r?.score ?? DEFAULT_READINESS;
    const target = targetBlocks(e.weight, readiness);
    const doneBefore = doneFor(e, (d) => d < today);
    const doneToday = doneFor(e, (d) => d === today);
    return { e, readiness, rated: Boolean(r), target, doneBefore, doneToday };
  });

  const rem = new Map(base.filter((b) => studyable.includes(b.e)).map((b) => [b.e.courseId, Math.max(0, b.target - b.doneBefore)]));
  // Önce orantılı plan; bir ders sığmıyorsa boş kapasiteyi öne çeken plan denenir, daha az eksik kalan seçilir.
  const plain = allocate(today, rem, studyable, cap, false);
  const sum = (m: Map<string, number>) => [...m.values()].reduce((s, v) => s + v, 0);
  let pick = plain;
  if (sum(plain.left) > 0) {
    const pulled = allocate(today, rem, studyable, cap, true);
    if (sum(pulled.left) < sum(plain.left)) pick = pulled;
  }

  const courses: CoursePlan[] = base.map(({ e, readiness, rated, target, doneBefore, doneToday }) => {
    const plan = pick.perCourse.get(e.courseId);
    const daily = plan ? [...plan.entries()].map(([date, blocks]) => ({ date, blocks })).sort((a, b) => (a.date < b.date ? -1 : 1)) : [];
    return {
      courseId: e.courseId,
      name: names.get(e.courseId) ?? e.courseId,
      exam: e,
      readiness,
      rated,
      target,
      done: doneBefore + doneToday,
      doneToday,
      todayTarget: plan?.get(today) ?? 0,
      daily,
      shortfall: pick.left.get(e.courseId) ?? 0,
      past: e.date < today,
    };
  });

  const last = studyable.reduce((m, e) => (e.date > m ? e.date : m), today);
  const days: StudyPlan["days"] = [];
  for (let d = today; d < last; d = addDays(d, 1)) {
    days.push({ date: d, total: courses.reduce((s, c) => s + (c.daily.find((x) => x.date === d)?.blocks ?? 0), 0), cap: dayCap(d, studyable, cap) });
  }

  const warnings: string[] = [];
  const short = courses.filter((x) => x.shortfall > 0);
  if (short.length > 0 && short.length <= 2) {
    for (const c of short) warnings.push(`Bu hızla ${c.name} hedefin altında kalır: sınava kadar ${c.shortfall} blok eksik (hedef ${c.target}, yapılan ${c.done}).`);
  } else if (short.length > 2) {
    const missing = short.reduce((s, c) => s + c.shortfall, 0);
    warnings.push(`Bu hızla ${short.length} ders hedefin altında kalır: toplam ${missing} blok eksik (günde en fazla ${cap} blokla sığmıyor). Eksik derslere yayıldı; ders kartlarında ayrı ayrı yazıyor.`);
  }
  if (short.length) warnings.push("Günlük blok sınırını artırmak ya da hazırlık puanlarını güncellemek planı değiştirir.");

  return {
    today,
    cap,
    courses,
    todayTarget: courses.reduce((s, c) => s + c.todayTarget, 0),
    todayDone: courses.filter((c) => !c.past).reduce((s, c) => s + c.doneToday, 0),
    days,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Sınav çakışması — süre bilinmiyor, uydurulmaz; yalnızca aradaki zaman söylenir.

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export interface ExamConflict {
  date: string;
  first: Exam;
  second: Exam;
  gapMin: number;
  message: string;
}

/** Aynı gün başlangıçları arasında `minGapMin`'den az olan sınavlar. */
export function examConflicts(exams: Exam[], courses: Course[], minGapMin = 120): ExamConflict[] {
  const names = new Map(courses.map((c) => [c.id, c.name]));
  const sorted = [...exams].sort((a, b) => (examKey(a) < examKey(b) ? -1 : 1));
  const out: ExamConflict[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (a.date !== b.date) continue;
    const gap = minutes(b.time) - minutes(a.time);
    if (gap >= minGapMin) continue;
    const gapText = gap % 60 === 0 ? `${gap / 60} saat` : `${gap} dakika`;
    out.push({
      date: a.date,
      first: a,
      second: b,
      gapMin: gap,
      message: `${formatTrDate(a.date)}: ${a.time} ${names.get(a.courseId)} ile ${b.time} ${names.get(b.courseId)} sınavlarının başlangıcı arasında yalnızca ${gapText} var. Sınav süreleri bilinmiyor — okuldan teyit edin.`,
    });
  }
  return out;
}

/** Sınav haftası: ilk ve son sınav günü arası (dahil). */
export function examWeek(exams: Exam[]): { from: string; to: string } | null {
  if (!exams.length) return null;
  const dates = exams.map((e) => e.date).sort();
  return { from: dates[0], to: dates.at(-1)! };
}

export function inExamWeek(date: string, exams: Exam[]): boolean {
  const w = examWeek(exams);
  return Boolean(w && date >= w.from && date <= w.to);
}

export function classesOn(date: string, sessions: ClassSession[]): ClassSession[] {
  const wd = isoWeekday(date);
  return sessions.filter((s) => s.weekday === wd).sort((a, b) => (a.start < b.start ? -1 : 1));
}

/** "7 gün 3 saat", "5 saat 20 dk", "geçti" — sınav saatine kadar (TR yerel saatleri). */
export function countdown(fromDate: string, fromTime: string, toDate: string, toTime: string): string {
  const total = daysBetween(fromDate, toDate) * 1440 + minutes(toTime) - minutes(fromTime);
  if (total <= 0) return "geçti";
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (d > 0) return `${d} gün ${h} saat`;
  if (h > 0) return `${h} saat ${m} dk`;
  return `${m} dk`;
}

// ---------------------------------------------------------------------------
// Notlar'dan geriye dönük giriş — satır satır, tahmin etmeden.

export interface ImportLine {
  line: string;
  ok: boolean;
  date?: string;
  courseId?: string;
  blocks?: number;
  /** Anlaşılamadıysa neden */
  reason?: string;
}

const MONTHS_NORM = TR_MONTHS.map((m) => normalizeTr(m));

function parseDate(text: string, today: string): string | null {
  const t = normalizeTr(text);
  if (/\bbugun\b/.test(t)) return today;
  if (/\bdun\b/.test(t)) return addDays(today, -1);
  const year = Number(today.slice(0, 4));
  let d: number | null = null;
  let m: number | null = null;
  let y = year;
  const num = text.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/);
  if (num) {
    d = Number(num[1]);
    m = Number(num[2]);
    if (num[3]) y = Number(num[3].length === 2 ? `20${num[3]}` : num[3]);
  } else {
    const named = t.match(new RegExp(`\\b(\\d{1,2}) (${MONTHS_NORM.join("|")})\\b`));
    if (named) {
      d = Number(named[1]);
      m = MONTHS_NORM.indexOf(named[2]) + 1;
    }
  }
  if (!d || !m || m > 12 || d > 31) return null;
  // Yıl yazılmadıysa bu yıl; ileri bir tarih çıkarsa çağıran "ileri tarih" der (geçen yıla kaydırıp tahmin etmez).
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function findCourse(text: string, courses: Course[]): { id: string } | "belirsiz" | null {
  const t = ` ${normalizeTr(text)} `;
  const code = text.toUpperCase().match(/\bBSM\s?(\d{4})\b/);
  if (code) {
    const c = courses.find((x) => x.id === `BSM${code[1]}`);
    if (c) return { id: c.id };
  }
  let best: { id: string; len: number } | null = null;
  let tie = false;
  for (const c of courses) {
    for (const a of c.aliases) {
      if (!t.includes(` ${a} `)) continue;
      if (!best || a.length > best.len) {
        best = { id: c.id, len: a.length };
        tie = false;
      } else if (a.length === best.len && best.id !== c.id) tie = true;
    }
  }
  if (tie) return "belirsiz";
  return best ? { id: best.id } : null;
}

export function parseBlocks(text: string, blockMin: number): number | null {
  // Ondalık virgül normalizeTr'den ÖNCE noktaya çevrilir ("1,5 saat" → 1.5).
  const t = normalizeTr(text.replace(/(\d),(\d)/g, "$1x$2")).replace(/(\d)x(\d)/g, "$1.$2");
  const WORDS: Record<string, number> = { bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8 };
  const word = t.match(/\b(bir|iki|uc|dort|bes|alti|yedi|sekiz) blok\b/);
  if (word) return WORDS[word[1]];
  const blok = t.match(/\b(\d+(?:\.\d+)?) ?(?:blok|b)\b/);
  if (blok) return Math.round(Number(blok[1]));
  const saat = t.match(/\b(\d+(?:\.\d+)?) ?(?:saat|sa|h)\b/);
  const dk = t.match(/\b(\d+) ?(?:dakika|dk)\b/);
  if (saat || dk) {
    const mins = (saat ? Number(saat[1]) * 60 : 0) + (dk ? Number(dk[1]) : 0);
    return Math.max(1, Math.round(mins / blockMin));
  }
  return null;
}

/** Her satır: tarih + ders + blok ("25.10 ayrık 2 blok", "24 Ekim Devre 1,5 saat"). Anlaşılmayan satır atlanır, nedeni gösterilir. */
export function parseStudyImport(text: string, params: { today: string; courses: Course[]; blockMin: number }): ImportLine[] {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line): ImportLine => {
      const date = parseDate(line, params.today);
      if (!date) return { line, ok: false, reason: "tarih yok" };
      if (date > params.today) return { line, ok: false, reason: "ileri tarih" };
      // Tarih kısmı silinir ki "25.10" blok sayısı sanılmasın.
      const rest = line.replace(/\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b/, " ");
      const course = findCourse(rest, params.courses);
      if (course === "belirsiz") return { line, ok: false, date, reason: "ders belirsiz" };
      if (!course) return { line, ok: false, date, reason: "ders bulunamadı" };
      const blocks = parseBlocks(rest, params.blockMin);
      if (!blocks || blocks < 1 || blocks > 20) return { line, ok: false, date, courseId: course.id, reason: "blok sayısı yok" };
      return { line, ok: true, date, courseId: course.id, blocks };
    });
}

/** Yapıştırılan müfredattan konu listesi: satır başı işaretleri ve numaralar atılır, boşlar ve tekrarlar elenir. */
export function parseSyllabus(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\n+/)) {
    const line = raw
      .replace(/^\s*(?:\d+\s*\.?\s*hafta|hafta\s*\d+)\s*[:.\-–]?\s*/i, "")
      .replace(/^\s*(?:[-*•▪◦–]|\d+[.)]|\(\d+\))\s*/, "")
      .trim()
      .slice(0, 140);
    const key = normalizeTr(line);
    if (line.length < 2 || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= 60) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Günlük özet (Bugün ekranı, sabah konuşması, sohbet bağlamı için)

export interface StudyDay {
  /** Bugünkü dersler + "derse gittim" durumu */
  classes: { sessionId: string; courseId: string; name: string; start: string; end: string; attended: boolean }[];
  /** Ders hatırlatması yapılsın mı (sınav haftasında ayara bağlı) */
  remindClasses: boolean;
  examWeek: boolean;
  /** Derslik yalnızca ekran + koddan kurulan mesaj içindir; modele giden metinde kullanılmaz */
  examsToday: { courseId: string; name: string; time: string; rooms: string }[];
  examsTomorrow: { courseId: string; name: string; time: string; rooms: string }[];
  nextExam: { name: string; date: string; time: string } | null;
  /** Bugün ve sonrası sınavlar — derslik YOK (modele giden metin bundan kurulur) */
  upcomingExams: { name: string; date: string; time: string }[];
  blockTarget: number;
  blocksDone: number;
  perCourse: { name: string; todayTarget: number; doneToday: number }[];
  warnings: string[];
}

export function buildStudyDay(params: {
  today: string;
  time: string;
  courses: Course[];
  sessions: ClassSession[];
  exams: Exam[];
  plan: StudyPlan;
  attended: Set<string>;
  remindInExamWeek: boolean;
}): StudyDay {
  const names = new Map(params.courses.map((c) => [c.id, c.name]));
  const name = (id: string) => names.get(id) ?? id;
  const examWeekNow = inExamWeek(params.today, params.exams);
  const examRow = (e: Exam) => ({ courseId: e.courseId, name: name(e.courseId), time: e.time, rooms: e.rooms });
  const upcoming = params.exams.filter((e) => e.date > params.today || (e.date === params.today && e.time >= params.time)).sort((a, b) => (examKey(a) < examKey(b) ? -1 : 1));
  return {
    classes: classesOn(params.today, params.sessions).map((s) => ({ sessionId: s.id, courseId: s.courseId, name: name(s.courseId), start: s.start, end: s.end, attended: params.attended.has(s.id) })),
    remindClasses: !examWeekNow || params.remindInExamWeek,
    examWeek: examWeekNow,
    examsToday: params.exams.filter((e) => e.date === params.today).sort((a, b) => (a.time < b.time ? -1 : 1)).map(examRow),
    examsTomorrow: params.exams.filter((e) => e.date === addDays(params.today, 1)).sort((a, b) => (a.time < b.time ? -1 : 1)).map(examRow),
    nextExam: upcoming[0] ? { name: name(upcoming[0].courseId), date: upcoming[0].date, time: upcoming[0].time } : null,
    upcomingExams: upcoming.map((e) => ({ name: name(e.courseId), date: e.date, time: e.time })),
    blockTarget: params.plan.todayTarget,
    blocksDone: params.plan.todayDone,
    perCourse: params.plan.courses.filter((c) => c.todayTarget > 0 || c.doneToday > 0).map((c) => ({ name: c.name, todayTarget: c.todayTarget, doneToday: c.doneToday })),
    warnings: params.plan.warnings,
  };
}

/** Modele giden kısa metin — YALNIZCA ders adı, sınav tarihi/saati ve blok sayıları (derslik, kimlik yok). */
export function describeStudyForModel(day: StudyDay): string {
  const lines: string[] = [];
  if (day.classes.length) lines.push(`Bugünkü ders: ${day.classes.map((c) => `${c.start}–${c.end} ${c.name}${c.attended ? " (gidildi)" : ""}`).join("; ")}.`);
  if (day.upcomingExams.length) lines.push(`Ara sınavlar: ${day.upcomingExams.map((e) => `${formatTrDate(e.date)} ${e.time} ${e.name}`).join("; ")}.`);
  if (day.blockTarget || day.blocksDone)
    lines.push(
      `Bugünkü çalışma hedefi (1 blok = odaklı çalışma): ${day.blockTarget} blok, yapılan ${day.blocksDone}${day.perCourse.length ? ` (${day.perCourse.map((p) => `${p.name} ${p.doneToday}/${p.todayTarget}`).join(", ")})` : ""}.`,
    );
  if (day.warnings.length) lines.push(`Çalışma planı uyarısı: ${day.warnings[0]}`);
  if (lines.length) lines.push("Blok kaydı ve derslik bilgisi Ders ekranında; sen derslik söyleme, blok kaydedemezsin.");
  return lines.join("\n");
}
