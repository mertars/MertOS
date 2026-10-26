"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ClipboardPaste, GraduationCap, Minus, Plus, Trash2 } from "lucide-react";
import {
  addStudyBlocks,
  addStudyBlocksBulk,
  ApiError,
  deleteStudyBlock,
  fetchStudy,
  previewStudyImport,
  restoreStudyBlock,
  saveSyllabus,
  setClassAttendance,
  setStudyReadiness,
  setTopicDone,
  type StudyOverviewClient,
} from "@/lib/assistant/client";
import { countdown, type CoursePlan, type ImportLine } from "@/lib/assistant/study";
import { formatTrDate } from "@/lib/assistant/text";
import { addDays, isoWeekday, weekdayName } from "@/lib/assistant/time";
import { saveAssistantSettings } from "@/lib/assistant/use-settings";
import { showUndoToast, useToastStore } from "@/lib/store/toast-store";
import { cn } from "@/lib/utils";
import { Check, MiniBar, Notice, Ring, SectionTitle } from "./bits";
import { CardLabel, GlassCard } from "./glass-card";

// "Ders ve Sınav" sekmesi (Bölüm 18). Plan KODLA hesaplanır (lib/assistant/study.ts);
// bu ekran yalnızca gösterir ve Mert'in kayıtlarını (blok, hazırlık, devam, konu) yazar.

const ACCENT = "--fx-ders";

function dayText(date: string, today: string): string {
  if (date === today) return "Bugün";
  if (date === addDays(today, 1)) return "Yarın";
  return `${formatTrDate(date)} ${weekdayName(isoWeekday(date))}`;
}

function useStudy() {
  const [data, setData] = useState<StudyOverviewClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const push = useToastStore((s) => s.push);
  const reload = useCallback(
    () =>
      fetchStudy()
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e) => setError(e instanceof ApiError && e.status === 0 ? "İnternet yok — ders ekranı açılamadı." : e instanceof Error ? e.message : "Hata")),
    [],
  );
  useEffect(() => {
    void reload();
  }, [reload]);
  const run = useCallback(
    async (fn: () => Promise<unknown>, fail = "Kaydedilemedi") => {
      try {
        await fn();
      } catch (e) {
        push({ title: fail, description: e instanceof Error ? e.message : undefined, variant: "danger" });
      }
      await reload();
    },
    [push, reload],
  );
  return { data, error, reload, run };
}

export function StudyView() {
  const { data, error, reload, run } = useStudy();

  if (!data) {
    return (
      <main className="mx-auto max-w-5xl px-4 pb-10 lg:px-7">
        <SectionTitle eyebrow="Ara sınavlar 3–6 Kasım" title="Ders ve Sınav" />
        {error ? <Notice action={<button onClick={() => void reload()} className="fx-chip">Yeniden dene</button>}>{error}</Notice> : <div className="h-40 animate-pulse rounded-[26px] bg-white/[0.04]" />}
      </main>
    );
  }

  const { plan, day, today } = data;
  const name = (id: string) => data.courses.find((c) => c.id === id)?.name ?? id;

  async function addBlock(courseId: string, blocks = 1, date = today) {
    try {
      const { blocks: saved } = await addStudyBlocks({ date, courseId, blocks });
      const id = saved[0].id;
      showUndoToast(`Kaydettim: ${name(courseId)} +${blocks} blok${date === today ? "" : ` (${formatTrDate(date)})`}`, () => void run(() => deleteStudyBlock(id), "Geri alınamadı"));
    } catch (e) {
      useToastStore.getState().push({ title: "Kaydedilemedi", description: e instanceof Error ? e.message : undefined, variant: "danger" });
    }
    await reload();
  }

  async function removeBlock(id: number, label: string) {
    await run(() => deleteStudyBlock(id), "Silinemedi");
    showUndoToast(`Silindi: ${label}`, () => void run(() => restoreStudyBlock(id), "Geri alınamadı"));
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-10 lg:px-7">
      <SectionTitle
        eyebrow={data.examWeek ? `Ara sınavlar ${formatTrDate(data.examWeek.from).split(" ")[0]}–${formatTrDate(data.examWeek.to)}` : "Dersler"}
        title="Ders ve Sınav"
        right={<GraduationCap className="mb-1 h-6 w-6 text-[var(--fx-ders)]" />}
      />
      {data.conflicts.map((c) => (
        <Notice key={c.message}>
          <span className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--fx-program)]" />
            <span>{c.message}</span>
          </span>
        </Notice>
      ))}
      {plan.warnings.length > 0 && (
        <Notice>
          {plan.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </Notice>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_1.15fr] lg:gap-4">
        <div className="space-y-3 lg:space-y-4">
          <NextExamCard data={data} />
          <TodayCard data={data} onAdd={(id) => void addBlock(id)} onAttend={(sid, v) => void run(() => setClassAttendance(sid, v))} />
          <AddBlockCard data={data} onAdd={(id, n, d) => void addBlock(id, n, d)} />
          <RecentCard data={data} onRemove={(id, label) => void removeBlock(id, label)} />
        </div>
        <div className="space-y-3 lg:space-y-4">
          {plan.courses.map((c, i) => (
            <CourseCard
              key={c.courseId}
              plan={c}
              today={today}
              time={data.time}
              index={i + 2}
              topics={data.topics.filter((t) => t.courseId === c.courseId)}
              onAdd={() => void addBlock(c.courseId)}
              onRate={(score) => void run(() => setStudyReadiness(c.courseId, score))}
              onTopic={(id, done) => void run(() => setTopicDone(id, done))}
              onSyllabus={(text) => run(() => saveSyllabus(c.courseId, text))}
            />
          ))}
          <ImportCard data={data} onSaved={reload} />
          <StudySettingsCard data={data} onSaved={reload} />
        </div>
      </div>
      <p className="mt-6 text-center text-[11px] text-[var(--fx-text-3)]">
        Plan kodla hesaplanır (LLM yok) · 1 blok = {data.settings.blokDk} dk · günde en fazla {data.settings.gunlukBlok} blok · koşu ve öğün saatlerine dokunmaz
      </p>
      {day.examWeek && !day.remindClasses && <p className="mt-1 text-center text-[11px] text-[var(--fx-text-3)]">Sınav haftası: ders hatırlatması kapalı (aşağıdaki ayardan açılır).</p>}
    </main>
  );
}

function NextExamCard({ data }: { data: StudyOverviewClient }) {
  const upcoming = data.exams.filter((e) => e.date > data.today || (e.date === data.today && e.time >= data.time));
  const next = upcoming[0];
  const name = (id: string) => data.courses.find((c) => c.id === id)?.name ?? id;
  return (
    <GlassCard accent={ACCENT} index={1} className="p-5">
      <CardLabel>Sıradaki sınav</CardLabel>
      {next ? (
        <>
          <p className="fx-num mt-2 text-[34px] leading-none">{countdown(data.today, data.time, next.date, next.time)}</p>
          <p className="mt-2 text-[17px] font-medium">{name(next.courseId)}</p>
          <p className="mt-0.5 text-[12.5px] text-[var(--fx-text-2)]">
            {dayText(next.date, data.today)} {next.time} · %{next.weight} · {next.rooms}
          </p>
          <ul className="mt-4 space-y-1.5 border-t border-white/[0.07] pt-3">
            {upcoming.slice(1).map((e) => (
              <li key={e.id} className="flex items-baseline gap-3 text-[12.5px]">
                <span className="fx-num w-[78px] shrink-0 whitespace-nowrap text-[10.5px] text-[var(--fx-text-3)]">
                  {e.date.slice(8)}.{e.date.slice(5, 7)} {e.time}
                </span>
                <span className="min-w-0 flex-1 truncate">{name(e.courseId)}</span>
                <span className="fx-num shrink-0 text-[10.5px] text-[var(--fx-text-3)]">{countdown(data.today, data.time, e.date, e.time)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-[14px] text-[var(--fx-text-2)]">Yaklaşan sınav yok.</p>
      )}
    </GlassCard>
  );
}

function TodayCard({ data, onAdd, onAttend }: { data: StudyOverviewClient; onAdd: (courseId: string) => void; onAttend: (sessionId: string, attended: boolean) => void }) {
  const { plan, day } = data;
  const rows = plan.courses.filter((c) => c.todayTarget > 0 || c.doneToday > 0);
  return (
    <GlassCard accent={ACCENT} index={2}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardLabel>Bugün</CardLabel>
          <p className="mt-1 text-[12.5px] text-[var(--fx-text-2)]">
            Hedef {plan.todayTarget} blok · {((plan.todayTarget * data.settings.blokDk) / 60).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} saat
          </p>
        </div>
        <Ring value={plan.todayTarget ? plan.todayDone / plan.todayTarget : 0} color="var(--fx-ders)" size={70} stroke={6}>
          <span className="fx-num text-[17px]">
            {plan.todayDone}/{plan.todayTarget}
          </span>
          <span className="text-[8.5px] tracking-[0.12em] text-[var(--fx-text-3)]">BLOK</span>
        </Ring>
      </div>

      {day.classes.length > 0 && (
        <ul className="mt-3 space-y-1">
          {day.classes.map((c) => (
            <li key={c.sessionId} className="flex items-center gap-3 rounded-[14px] bg-white/[0.04] px-3 py-2">
              <Check done={c.attended} onToggle={() => onAttend(c.sessionId, !c.attended)} label={c.attended ? "Derse gittim işaretini kaldır" : "Derse gittim"} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px]">{c.name}</span>
                <span className="fx-num block text-[10.5px] text-[var(--fx-text-3)]">
                  DERS {c.start}–{c.end} {c.attended ? "· GİDİLDİ" : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-[var(--fx-text-3)]">Bugün için planlanan blok yok.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((c) => (
            <li key={c.courseId} className="flex items-center gap-3">
              <MiniBar label={c.name} value={`${c.doneToday}/${c.todayTarget}`} ratio={c.todayTarget ? c.doneToday / c.todayTarget : 1} color={ACCENT} />
              <button
                type="button"
                onClick={() => onAdd(c.courseId)}
                aria-label={`${c.name}: 1 blok ekle`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-[var(--fx-ders)] active:scale-95"
              >
                <Plus className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}

function AddBlockCard({ data, onAdd }: { data: StudyOverviewClient; onAdd: (courseId: string, blocks: number, date: string) => void }) {
  const [courseId, setCourseId] = useState(data.plan.courses.find((c) => !c.past)?.courseId ?? data.courses[0]?.id ?? "");
  const [blocks, setBlocks] = useState(1);
  const [date, setDate] = useState(data.today);
  return (
    <GlassCard accent={ACCENT} index={3}>
      <CardLabel>Blok kaydet</CardLabel>
      <div className="mt-3 grid gap-2">
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} aria-label="Ders" className="h-11 rounded-[12px] border border-white/12 bg-black/40 px-3 text-[14px]">
          {data.courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <div className="flex h-11 items-center rounded-[12px] border border-white/12 bg-black/40">
            <button type="button" aria-label="Azalt" onClick={() => setBlocks((b) => Math.max(1, b - 1))} className="grid h-11 w-10 place-items-center">
              <Minus className="h-4 w-4" />
            </button>
            <span className="fx-num w-14 text-center text-[14px]" aria-label="Blok sayısı">
              {blocks} blok
            </span>
            <button type="button" aria-label="Artır" onClick={() => setBlocks((b) => Math.min(20, b + 1))} className="grid h-11 w-10 place-items-center">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <input
            type="date"
            value={date}
            max={data.today}
            onChange={(e) => setDate(e.target.value || data.today)}
            aria-label="Tarih"
            className="h-11 min-w-0 flex-1 rounded-[12px] border border-white/12 bg-black/40 px-3 text-[14px] [color-scheme:dark]"
          />
        </div>
        <button
          type="button"
          onClick={() => onAdd(courseId, blocks, date)}
          className="h-11 rounded-[12px] text-[14px] font-semibold text-black"
          style={{ background: "var(--fx-ders)" }}
        >
          Kaydet
        </button>
      </div>
      <p className="mt-2 text-[11.5px] text-[var(--fx-text-3)]">Geçmiş bir günü de seçebilirsiniz. Toplu giriş için aşağıdaki “Notlar’dan aktar”.</p>
    </GlassCard>
  );
}

function RecentCard({ data, onRemove }: { data: StudyOverviewClient; onRemove: (id: number, label: string) => void }) {
  const name = (id: string) => data.courses.find((c) => c.id === id)?.name ?? id;
  const [all, setAll] = useState(false);
  const list = all ? data.recent : data.recent.slice(0, 6);
  return (
    <GlassCard accent={ACCENT} index={4}>
      <CardLabel>Son kayıtlar</CardLabel>
      {data.recent.length === 0 && <p className="mt-2 text-[13px] text-[var(--fx-text-3)]">Henüz blok kaydı yok.</p>}
      <ul className="mt-2 divide-y divide-white/[0.06]">
        {list.map((b) => {
          const label = `${name(b.courseId)} ${b.blocks} blok (${formatTrDate(b.date)})`;
          return (
            <li key={b.id} className="flex items-center gap-3 py-2">
              <span className="fx-num w-[64px] shrink-0 text-[10.5px] text-[var(--fx-text-3)]">{formatTrDate(b.date).toLocaleUpperCase("tr-TR")}</span>
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{name(b.courseId)}</span>
              <span className="fx-num text-[12px]">{b.blocks} b</span>
              <button type="button" onClick={() => onRemove(b.id, label)} aria-label={`Sil: ${label}`} className="grid h-9 w-9 place-items-center text-[var(--fx-text-3)]">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
      {data.recent.length > 6 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-1 text-[12px] text-[var(--fx-text-2)]">
          {all ? "Daha az" : `Tümü (${data.recent.length})`}
        </button>
      )}
    </GlassCard>
  );
}

function CourseCard({
  plan,
  today,
  time,
  index,
  topics,
  onAdd,
  onRate,
  onTopic,
  onSyllabus,
}: {
  plan: CoursePlan;
  today: string;
  time: string;
  index: number;
  topics: StudyOverviewClient["topics"];
  onAdd: () => void;
  onRate: (score: number) => void;
  onTopic: (id: number, done: boolean) => void;
  onSyllabus: (text: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [paste, setPaste] = useState<string | null>(null);
  const e = plan.exam;
  const doneTopics = topics.filter((t) => t.done).length;
  return (
    <GlassCard accent={ACCENT} index={index} className={cn(plan.past && "opacity-55")}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15.5px] font-medium leading-snug">{plan.name}</p>
          <p className="fx-num mt-0.5 text-[10.5px] text-[var(--fx-text-3)]">
            {e.courseId} · {formatTrDate(e.date).toLocaleUpperCase("tr-TR")} {e.time} · %{e.weight} · {plan.past ? "SINAV GEÇTİ" : countdown(today, time, e.date, e.time).toLocaleUpperCase("tr-TR")}
          </p>
        </div>
        {!plan.past && (
          <button type="button" onClick={onAdd} aria-label={`${plan.name}: 1 blok ekle`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-[var(--fx-ders)] active:scale-95">
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3">
        <MiniBar label="Yapılan / hedef" value={`${plan.done}/${plan.target} blok`} ratio={plan.target ? plan.done / plan.target : 0} color={ACCENT} />
        {!plan.past && (
          <p className="mt-1.5 text-[11.5px] text-[var(--fx-text-3)]">
            Bugün {plan.todayTarget} blok{plan.shortfall > 0 ? ` · bu hızla ${plan.shortfall} blok eksik kalır` : ""}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-[11.5px] text-[var(--fx-text-2)]">Hazırlık</span>
        <div className="flex gap-1" role="radiogroup" aria-label={`${plan.name} hazırlık puanı`}>
          {[1, 2, 3, 4, 5].map((n) => {
            const on = plan.rated && plan.readiness === n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onRate(n)}
                className={cn("fx-num grid h-8 w-8 place-items-center rounded-full text-[12px] transition-colors", on ? "text-black" : "border border-white/12 text-[var(--fx-text-2)]")}
                style={on ? { background: "var(--fx-ders)" } : undefined}
              >
                {n}
              </button>
            );
          })}
        </div>
        {!plan.rated && <span className="text-[10.5px] text-[var(--fx-program)]">puan verin (şimdilik 3)</span>}
      </div>

      <button type="button" onClick={() => setOpen((v) => !v)} className="mt-3 flex items-center gap-1 text-[12px] text-[var(--fx-text-2)]" aria-expanded={open}>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        {topics.length ? `Konular ${doneTopics}/${topics.length}` : "Konu listesi (isteğe bağlı)"}
        {e.rooms && <span className="ml-2 text-[var(--fx-text-3)]">· {e.rooms}</span>}
      </button>
      {open && (
        <div className="mt-2">
          {topics.length > 0 && (
            <ul className="space-y-0.5">
              {topics.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <Check done={t.done} onToggle={() => onTopic(t.id, !t.done)} label={t.title} />
                  <span className={cn("text-[13px]", t.done && "text-[var(--fx-text-3)] line-through")}>{t.title}</span>
                </li>
              ))}
            </ul>
          )}
          {paste === null ? (
            <button type="button" onClick={() => setPaste("")} className="fx-chip mt-2">
              <ClipboardPaste className="h-3 w-3" /> {topics.length ? "Müfredatı değiştir" : "Müfredat yapıştır"}
            </button>
          ) : (
            <div className="mt-2 space-y-2">
              <textarea
                value={paste}
                onChange={(ev) => setPaste(ev.target.value)}
                rows={6}
                placeholder={"Her satır bir konu:\n1. Hafta: …\n2. Hafta: …"}
                className="w-full rounded-[12px] border border-white/12 bg-black/40 p-3 text-[13px]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void onSyllabus(paste).then(() => setPaste(null))}
                  className="h-9 rounded-[10px] px-4 text-[13px] font-semibold text-black"
                  style={{ background: "var(--fx-ders)" }}
                >
                  Listeyi oluştur
                </button>
                <button type="button" onClick={() => setPaste(null)} className="h-9 px-3 text-[13px] text-[var(--fx-text-2)]">
                  Vazgeç
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function ImportCard({ data, onSaved }: { data: StudyOverviewClient; onSaved: () => Promise<void> }) {
  const [text, setText] = useState("");
  const [lines, setLines] = useState<ImportLine[] | null>(null);
  const [busy, setBusy] = useState(false);
  const push = useToastStore((s) => s.push);
  const name = (id?: string) => data.courses.find((c) => c.id === id)?.name ?? "?";
  const ok = lines?.filter((l) => l.ok) ?? [];

  async function preview() {
    setBusy(true);
    try {
      setLines((await previewStudyImport(text)).lines);
    } catch (e) {
      push({ title: "Okunamadı", description: e instanceof Error ? e.message : undefined, variant: "danger" });
    }
    setBusy(false);
  }

  async function save() {
    setBusy(true);
    try {
      const { blocks } = await addStudyBlocksBulk(ok.map((l) => ({ date: l.date!, courseId: l.courseId!, blocks: l.blocks! })));
      showUndoToast(`${blocks.length} kayıt eklendi`, () => void Promise.all(blocks.map((b) => deleteStudyBlock(b.id))).then(onSaved));
      setText("");
      setLines(null);
      await onSaved();
    } catch (e) {
      push({ title: "Kaydedilemedi", description: e instanceof Error ? e.message : undefined, variant: "danger" });
    }
    setBusy(false);
  }

  return (
    <GlassCard accent={ACCENT} index={12}>
      <CardLabel>Notlar’dan aktar</CardLabel>
      <p className="mt-1 text-[12px] text-[var(--fx-text-3)]">Her satır: tarih, ders, blok. Ör. “25.10 ayrık 2 blok”, “24 Ekim devre 1,5 saat”. Anlaşılmayan satır yazılmaz.</p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setLines(null);
        }}
        rows={4}
        className="mt-2 w-full rounded-[12px] border border-white/12 bg-black/40 p-3 text-[13px]"
        placeholder="Notlar'daki listeyi buraya yapıştırın"
      />
      {lines && (
        <ul className="mt-2 space-y-1 text-[12.5px]">
          {lines.map((l, i) => (
            <li key={i} className={cn("flex gap-2", !l.ok && "text-[var(--fx-text-3)]")}>
              <span className="w-4 shrink-0">{l.ok ? "✓" : "–"}</span>
              <span className="min-w-0 flex-1">
                {l.ok ? `${formatTrDate(l.date!)} · ${name(l.courseId)} · ${l.blocks} blok` : `${l.line} (${l.reason})`}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={!text.trim() || busy} onClick={() => void preview()} className="fx-chip disabled:opacity-40">
          Önizle
        </button>
        {ok.length > 0 && (
          <button type="button" disabled={busy} onClick={() => void save()} className="h-8 rounded-full px-4 text-[12.5px] font-semibold text-black" style={{ background: "var(--fx-ders)" }}>
            {ok.length} satırı kaydet
          </button>
        )}
      </div>
    </GlassCard>
  );
}

function Stepper({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13.5px]">{label}</span>
      <div className="flex items-center rounded-[12px] border border-white/12 bg-black/40">
        <button type="button" aria-label={`${label} azalt`} onClick={() => onChange(Math.max(min, value - step))} className="grid h-9 w-9 place-items-center">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="fx-num w-16 text-center text-[13px]">
          {value} {unit}
        </span>
        <button type="button" aria-label={`${label} artır`} onClick={() => onChange(Math.min(max, value + step))} className="grid h-9 w-9 place-items-center">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function StudySettingsCard({ data, onSaved }: { data: StudyOverviewClient; onSaved: () => Promise<void> }) {
  const push = useToastStore((s) => s.push);
  const s = data.settings;
  async function save(patch: Partial<typeof s>) {
    try {
      await saveAssistantSettings(patch);
    } catch (e) {
      push({ title: "Kaydedilemedi", description: e instanceof Error ? e.message : undefined, variant: "danger" });
    }
    await onSaved();
  }
  return (
    <GlassCard accent={ACCENT} index={13}>
      <CardLabel>Çalışma ayarları</CardLabel>
      <div className="mt-3 space-y-2.5">
        <Stepper label="1 blok" value={s.blokDk} min={15} max={120} step={5} unit="dk" onChange={(blokDk) => void save({ blokDk })} />
        <Stepper label="Günlük sınır" value={s.gunlukBlok} min={1} max={16} step={1} unit="blok" onChange={(gunlukBlok) => void save({ gunlukBlok })} />
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-[13.5px]">Sınav haftasında ders hatırlatması</span>
            <span className="block text-[11px] text-[var(--fx-text-3)]">3–6 Kasım; varsayılan kapalı</span>
          </span>
          <input
            type="checkbox"
            checked={s.sinavHaftasiDers}
            onChange={(e) => void save({ sinavHaftasiDers: e.target.checked })}
            className="h-5 w-5 accent-[var(--fx-ders)]"
          />
        </label>
      </div>
    </GlassCard>
  );
}
