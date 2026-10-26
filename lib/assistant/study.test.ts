import { describe, expect, it } from "vitest";
import { CLASS_SESSIONS, COURSES, EXAMS } from "@/data/assistant/courses";
import { buildStudyPlan, classesOn, countdown, examConflicts, inExamWeek, parseStudyImport, parseSyllabus, targetBlocks, type StudyBlock } from "./study";

// Bölüm 18 — plan KOD ile hesaplanır. "Bugün" = 2026-10-27 Salı (bu testlerin yazıldığı gün).
const TODAY = "2026-10-27";
const block = (date: string, courseId: string, blocks: number, id = Math.random()): StudyBlock => ({ id, date, courseId, blocks, note: null, source: "ekran", createdAt: "" });
const plan = (over: Partial<Parameters<typeof buildStudyPlan>[0]> = {}) =>
  buildStudyPlan({ today: TODAY, courses: COURSES, exams: EXAMS, blocks: [], readiness: [], cap: 8, ...over });

describe("veri (görev dosyasından)", () => {
  it("8 ara sınav, 3 haftalık ders", () => {
    expect(EXAMS).toHaveLength(8);
    expect(classesOn("2026-10-26", CLASS_SESSIONS).map((c) => c.courseId)).toEqual(["BSM3017"]);
    expect(classesOn(TODAY, CLASS_SESSIONS).map((c) => `${c.courseId} ${c.start}`)).toEqual(["BSM3003 13:15"]);
    expect(classesOn("2026-10-30", CLASS_SESSIONS).map((c) => c.courseId)).toEqual(["BSM3007"]);
  });
  it("sınav haftası 3–6 Kasım", () => {
    expect([inExamWeek("2026-11-02", EXAMS), inExamWeek("2026-11-03", EXAMS), inExamWeek("2026-11-06", EXAMS), inExamWeek("2026-11-07", EXAMS)]).toEqual([false, true, true, false]);
  });
});

describe("targetBlocks", () => {
  it("ağırlık arttıkça ve hazırlık düştükçe büyür", () => {
    expect(targetBlocks(40, 3)).toBe(10);
    expect(targetBlocks(50, 3)).toBeGreaterThan(targetBlocks(40, 3));
    expect(targetBlocks(40, 1)).toBeGreaterThan(targetBlocks(40, 3));
    expect(targetBlocks(40, 5)).toBeLessThan(targetBlocks(40, 3));
    expect(targetBlocks(10, 5)).toBe(2);
  });
});

describe("buildStudyPlan — bugünün gerçek tarihiyle", () => {
  it("günlük sınırı geçmez, sınav günleri yarıya iner, sınav günü o derse çalışılmaz", () => {
    const p = plan();
    expect(p.todayTarget).toBeLessThanOrEqual(8);
    for (const d of p.days) expect(d.total).toBeLessThanOrEqual(d.cap);
    expect(p.days.find((d) => d.date === "2026-11-03")?.cap).toBe(4);
    for (const c of p.courses) expect(c.daily.every((x) => x.date < c.exam.date)).toBe(true);
    // 8 ders × ~10 blok, 7 tam gün + 3 yarım gün: sığmıyor → dürüst uyarı, eksik derslere yayılmış
    expect(p.warnings[0]).toMatch(/hedefin altında kalır/);
    expect(p.courses.every((c) => c.daily.length > 0)).toBe(true);
  });

  it("sınır artınca sığar, uyarı kalkar", () => {
    const p = plan({ cap: 12 });
    expect(p.warnings).toEqual([]);
    expect(p.courses.every((c) => c.shortfall === 0)).toBe(true);
  });

  it("yapılmayan bloklar sonraki günlere kayar (yarın hedef büyür)", () => {
    const tomorrow = "2026-10-28";
    const ifDone = plan({ today: tomorrow, blocks: plan({ cap: 20 }).courses.flatMap((c) => (c.todayTarget ? [block(TODAY, c.courseId, c.todayTarget)] : [])), cap: 20 });
    const ifSkipped = plan({ today: tomorrow, cap: 20 });
    expect(ifSkipped.todayTarget).toBeGreaterThan(ifDone.todayTarget);
  });

  it("hazırlık puanı düşükse hedef büyür; bugün yapılan bugünün ilerlemesine sayılır", () => {
    const low = plan({ readiness: [{ courseId: "BSM2037", score: 1, date: TODAY }] }).courses.find((c) => c.courseId === "BSM2037")!;
    const high = plan({ readiness: [{ courseId: "BSM2037", score: 5, date: TODAY }] }).courses.find((c) => c.courseId === "BSM2037")!;
    expect(low.target).toBeGreaterThan(high.target);
    expect(low.rated).toBe(true);
    const p = plan({ blocks: [block(TODAY, "BSM2037", 2)] });
    expect(p.todayDone).toBe(2);
    expect(p.courses.find((c) => c.courseId === "BSM2037")!.done).toBe(2);
  });

  it("sınavı geçen ders 'past', plana girmez", () => {
    const p = plan({ today: "2026-11-05" });
    expect(p.courses.filter((c) => c.past).map((c) => c.courseId)).toEqual(["BSM3017", "BSM2037", "BSM3007", "BSM2033"]);
    expect(p.courses.filter((c) => c.daily.length).map((c) => c.courseId)).toEqual(["BSM2035", "BSM2031"]);
  });
});

describe("examConflicts", () => {
  it("5 Kasım 15:00 ve 16:00 — süre uydurmadan uyarır", () => {
    const c = examConflicts(EXAMS, COURSES);
    expect(c).toHaveLength(1);
    expect(c[0].date).toBe("2026-11-05");
    expect(c[0].message).toBe(
      "5 Kasım: 15:00 Yazılım Mühendisliği ile 16:00 İstatistik ve Olasılık Hesapları sınavlarının başlangıcı arasında yalnızca 1 saat var. Sınav süreleri bilinmiyor — okuldan teyit edin.",
    );
  });
});

describe("countdown", () => {
  it("gün/saat", () => {
    expect(countdown(TODAY, "00:30", "2026-11-03", "11:30")).toBe("7 gün 11 saat");
    expect(countdown("2026-11-03", "09:10", "2026-11-03", "11:30")).toBe("2 saat 20 dk");
    expect(countdown("2026-11-03", "12:00", "2026-11-03", "11:30")).toBe("geçti");
  });
});

describe("parseStudyImport — Notlar'dan geriye dönük", () => {
  const parse = (t: string) => parseStudyImport(t, { today: TODAY, courses: COURSES, blockMin: 50 });
  it("tarih + ders + blok satırları", () => {
    const r = parse("25.10 ayrık 2 blok\n24 Ekim Devre teorisi 1,5 saat\n26.10.2026 BSM2031 3b\ndün yazılım 100 dk\n23/10 veri madenciliği 1 blok");
    expect(r.map((x) => [x.ok, x.date, x.courseId, x.blocks])).toEqual([
      [true, "2026-10-25", "BSM2037", 2],
      [true, "2026-10-24", "BSM2033", 2],
      [true, "2026-10-26", "BSM2031", 3],
      [true, "2026-10-26", "BSM3003", 2],
      [true, "2026-10-23", "BSM3007", 1],
    ]);
  });
  it("tahmin etmez: tarih yok, ders yok, belirsiz, blok yok, ileri tarih", () => {
    expect(parse("ayrık 2 blok\n25.10 fizik 2 blok\n25.10 veri 2 blok\n25.10 ayrık çalıştım\n30.10 ayrık 2 blok").map((x) => x.reason)).toEqual([
      "tarih yok",
      "ders bulunamadı",
      "ders bulunamadı",
      "blok sayısı yok",
      "ileri tarih",
    ]);
  });
});

describe("parseSyllabus", () => {
  it("madde işaretleri, numaralar ve hafta başlıkları atılır, tekrarlar elenir", () => {
    expect(parseSyllabus("1. Hafta: Kümeler\n2) Bağıntılar\n- Fonksiyonlar\n• Fonksiyonlar\n\nGraf teorisi")).toEqual(["Kümeler", "Bağıntılar", "Fonksiyonlar", "Graf teorisi"]);
  });
});
