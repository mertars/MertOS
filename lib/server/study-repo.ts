import type { Client, Row } from "@libsql/client";
import type { AssistantSettings } from "@/lib/assistant/config";
import { buildStudyDay, buildStudyPlan, examConflicts, examWeek, type ClassSession, type Course, type Exam, type ReadinessEntry, type StudyBlock, type StudyDay, type StudyPlan } from "@/lib/assistant/study";
import { addDays } from "@/lib/assistant/time";

// Ders ve sınav takibi (Bölüm 18) — okuma/yazma. Dersler, program ve sınavlar
// koddan senkronlanır (db-core.ts syncStudy); bloklar, hazırlık puanı, devam
// ve konu listesi Mert'in kayıtlarıdır. Öğrenci no / kimlik bilgisi tutulmaz.

const json = <T>(v: unknown, fallback: T): T => {
  try {
    return typeof v === "string" ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

export async function listCourses(db: Client): Promise<Course[]> {
  return (await db.execute(`SELECT * FROM courses WHERE active = 1 ORDER BY id`)).rows.map((r) => ({ id: String(r.id), name: String(r.name), aliases: json(r.aliases, []) }));
}

export async function listSessions(db: Client): Promise<ClassSession[]> {
  return (await db.execute(`SELECT * FROM class_sessions WHERE active = 1 ORDER BY weekday, start`)).rows.map((r) => ({
    id: String(r.id),
    courseId: String(r.course_id),
    weekday: Number(r.weekday),
    start: String(r.start),
    end: String(r.end),
  }));
}

export async function listExams(db: Client): Promise<Exam[]> {
  return (await db.execute(`SELECT * FROM exams WHERE active = 1 ORDER BY date, time`)).rows.map((r) => ({
    id: String(r.id),
    courseId: String(r.course_id),
    kind: String(r.kind),
    date: String(r.date),
    time: String(r.time),
    weight: Number(r.weight),
    rooms: String(r.rooms),
  }));
}

function toBlock(r: Row): StudyBlock {
  return {
    id: Number(r.id),
    date: String(r.date),
    courseId: String(r.course_id),
    blocks: Number(r.blocks),
    note: r.note == null ? null : String(r.note),
    source: String(r.source),
    createdAt: String(r.created_at),
  };
}

export async function listBlocks(db: Client): Promise<StudyBlock[]> {
  return (await db.execute(`SELECT * FROM study_blocks WHERE deleted_at IS NULL ORDER BY date, id`)).rows.map(toBlock);
}

export async function addBlocks(db: Client, e: { date: string; courseId: string; blocks: number; note?: string | null }, source = "ekran"): Promise<StudyBlock> {
  const now = new Date().toISOString();
  const res = await db.execute({
    sql: `INSERT INTO study_blocks (date, course_id, blocks, note, source, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [e.date, e.courseId, e.blocks, e.note ?? null, source, now],
  });
  return { id: Number(res.lastInsertRowid), date: e.date, courseId: e.courseId, blocks: e.blocks, note: e.note ?? null, source, createdAt: now };
}

/** Yumuşak silme — "Geri al" `restoreBlock` ile geri getirir. */
export async function deleteBlock(db: Client, id: number) {
  await db.execute({ sql: `UPDATE study_blocks SET deleted_at = ? WHERE id = ?`, args: [new Date().toISOString(), id] });
}

export async function restoreBlock(db: Client, id: number) {
  await db.execute({ sql: `UPDATE study_blocks SET deleted_at = NULL WHERE id = ?`, args: [id] });
}

export async function listReadiness(db: Client): Promise<ReadinessEntry[]> {
  return (await db.execute(`SELECT course_id, score, date FROM readiness ORDER BY date, id`)).rows.map((r) => ({ courseId: String(r.course_id), score: Number(r.score), date: String(r.date) }));
}

/** Her güncelleme yeni satır (geçmiş kalır); geçerli puan en sonuncusu. */
export async function setReadiness(db: Client, courseId: string, score: number, date: string) {
  await db.execute({ sql: `INSERT INTO readiness (course_id, score, date, created_at) VALUES (?, ?, ?, ?)`, args: [courseId, score, date, new Date().toISOString()] });
}

export async function listAttendance(db: Client, from: string, to: string): Promise<{ date: string; sessionId: string }[]> {
  return (await db.execute({ sql: `SELECT date, session_id FROM class_attendance WHERE date BETWEEN ? AND ? ORDER BY date`, args: [from, to] })).rows.map((r) => ({
    date: String(r.date),
    sessionId: String(r.session_id),
  }));
}

export async function setAttendance(db: Client, date: string, sessionId: string, attended: boolean) {
  if (attended) await db.execute({ sql: `INSERT OR IGNORE INTO class_attendance (date, session_id, created_at) VALUES (?, ?, ?)`, args: [date, sessionId, new Date().toISOString()] });
  else await db.execute({ sql: `DELETE FROM class_attendance WHERE date = ? AND session_id = ?`, args: [date, sessionId] });
}

export interface Topic {
  id: number;
  courseId: string;
  title: string;
  done: boolean;
}

export async function listTopics(db: Client): Promise<Topic[]> {
  return (await db.execute(`SELECT * FROM course_topics ORDER BY course_id, sort`)).rows.map((r) => ({ id: Number(r.id), courseId: String(r.course_id), title: String(r.title), done: Number(r.done) === 1 }));
}

/** Yapıştırılan müfredat dersin konu listesinin yerini alır; aynı başlıktaki "tamam" işaretleri korunur. */
export async function replaceTopics(db: Client, courseId: string, titles: string[]) {
  const old = (await listTopics(db)).filter((t) => t.courseId === courseId);
  const doneTitles = new Set(old.filter((t) => t.done).map((t) => t.title));
  await db.batch(
    [
      { sql: `DELETE FROM course_topics WHERE course_id = ?`, args: [courseId] },
      ...titles.map((title, i) => ({ sql: `INSERT INTO course_topics (course_id, title, sort, done) VALUES (?, ?, ?, ?)`, args: [courseId, title, i, doneTitles.has(title) ? 1 : 0] })),
    ],
    "write",
  );
}

export async function setTopicDone(db: Client, id: number, done: boolean) {
  await db.execute({ sql: `UPDATE course_topics SET done = ? WHERE id = ?`, args: [done ? 1 : 0, id] });
}

export interface StudyOverview {
  today: string;
  time: string;
  courses: Course[];
  sessions: ClassSession[];
  exams: Exam[];
  plan: StudyPlan;
  day: StudyDay;
  conflicts: { date: string; message: string }[];
  examWeek: { from: string; to: string } | null;
  /** Son kayıtlar (yeniden eskiye, en fazla 40) */
  recent: StudyBlock[];
  topics: Topic[];
  /** Son 14 günün devam kayıtları */
  attendance: { date: string; sessionId: string }[];
  settings: Pick<AssistantSettings, "blokDk" | "gunlukBlok" | "sinavHaftasiDers">;
}

export async function getStudyOverview(db: Client, now: { date: string; time: string }, settings: AssistantSettings): Promise<StudyOverview> {
  const [courses, sessions, exams, blocks, readiness, attendance, topics] = await Promise.all([
    listCourses(db),
    listSessions(db),
    listExams(db),
    listBlocks(db),
    listReadiness(db),
    listAttendance(db, addDays(now.date, -14), now.date),
    listTopics(db),
  ]);
  const plan = buildStudyPlan({ today: now.date, courses, exams, blocks, readiness, cap: settings.gunlukBlok });
  const day = buildStudyDay({
    today: now.date,
    time: now.time,
    courses,
    sessions,
    exams,
    plan,
    attended: new Set(attendance.filter((a) => a.date === now.date).map((a) => a.sessionId)),
    remindInExamWeek: settings.sinavHaftasiDers,
  });
  return {
    today: now.date,
    time: now.time,
    courses,
    sessions,
    exams,
    plan,
    day,
    conflicts: examConflicts(exams, courses).map((c) => ({ date: c.date, message: c.message })),
    examWeek: examWeek(exams),
    recent: [...blocks].sort((a, b) => b.id - a.id).slice(0, 40),
    topics,
    attendance,
    settings: { blokDk: settings.blokDk, gunlukBlok: settings.gunlukBlok, sinavHaftasiDers: settings.sinavHaftasiDers },
  };
}
