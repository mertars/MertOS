"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, GitBranch, GitPullRequest, KeyRound, Laptop, Lock, RefreshCw } from "lucide-react";
import { ApiError, fetchProjects, setProjectTracked, type ProjectsResponse } from "@/lib/assistant/client";
import { CI_LABELS, countTasks, shortName, type CiState, type ProjectView } from "@/lib/assistant/projects";
import { formatTrDate } from "@/lib/assistant/text";
import { useToastStore } from "@/lib/store/toast-store";
import { cn } from "@/lib/utils";
import { Check, Notice } from "./bits";
import { CardLabel, GlassCard } from "./glass-card";

// Projeler sekmesi (Faz 5): GitHub'dan YALNIZCA OKUNAN durum (ve Mac betiğinin elle yazdığı yerel özet).
// Her projede: bekleyen işler, testte bekleyen dallar, son güncelleme tarihi, veri kaynağı.

const ACCENT = "--fx-proje";
const NOTE_KEY = "mertos-proje-notu";

const dateText = (iso: string | null | undefined) => (iso ? `${formatTrDate(iso.slice(0, 10))}${iso.length > 10 ? ` ${new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}` : ""}` : "?");

const CI_COLOR: Record<CiState, string> = { bekliyor: "--fx-program", gecti: "--fx-saglik", kaldi: "--fx-asistan", yok: "--fx-text-3" };

function CiChip({ ci }: { ci: CiState }) {
  return (
    <span className="fx-chip !h-6 !text-[10px]" style={{ ["--accent" as string]: `var(${CI_COLOR[ci]})` }}>
      {CI_LABELS[ci]}
    </span>
  );
}

export function ProjectsPanel() {
  const [data, setData] = useState<ProjectsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const push = useToastStore((s) => s.push);

  const load = useCallback(async (opts: { yenile?: boolean; depolar?: boolean } = {}) => {
    setBusy(true);
    try {
      setData(await fetchProjects(opts));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 0 ? "İnternet yok — projeler açılamadı." : e instanceof Error ? e.message : "Hata");
    }
    setBusy(false);
  }, []);
  useEffect(() => {
    // ilk yükleme: zaman uyumsuz zincir içinde (efekt gövdesinde eşzamanlı setState yok)
    fetchProjects()
      .then((d) => setData(d))
      .catch((e) => setError(e instanceof ApiError && e.status === 0 ? "İnternet yok — projeler açılamadı." : e instanceof Error ? e.message : "Hata"));
  }, []);

  async function toggle(id: string, tracked: boolean) {
    try {
      await setProjectTracked(id, tracked);
    } catch (e) {
      push({ title: "Kaydedilemedi", description: e instanceof Error ? e.message : undefined, variant: "danger" });
    }
    await load();
  }

  if (!data) return error ? <Notice action={<button onClick={() => void load()} className="fx-chip">Yeniden dene</button>}>{error}</Notice> : <div className="h-40 animate-pulse rounded-[26px] bg-white/[0.04]" />;

  const tracked = data.projects;
  return (
    <div className="space-y-3 lg:space-y-4">
      {error && <Notice>{error}</Notice>}
      {!data.configured && <SetupCard />}
      {data.configured && data.error && (
        <Notice>
          <span className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--fx-program)]" />
            <span>
              {data.error.message} {tracked.length ? "Son kaydedilen durum gösteriliyor." : ""}
            </span>
          </span>
        </Notice>
      )}
      <HeadsUp />

      {data.configured && (
        <GlassCard accent={ACCENT} index={1}>
          <div className="flex items-center justify-between gap-3">
            <CardLabel>İzlenecek depolar</CardLabel>
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={() => void load({ depolar: true })} className="fx-chip disabled:opacity-40">
                Listeyi yenile
              </button>
            </div>
          </div>
          {data.repos.length === 0 && <p className="mt-2 text-[13px] text-[var(--fx-text-3)]">Anahtarın göreceği depo bulunamadı. Anahtara depo eklediniz mi?</p>}
          <ul className="mt-2 divide-y divide-white/[0.06]">
            {data.repos.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-1.5">
                <Check done={r.tracked} onToggle={() => void toggle(r.id, !r.tracked)} label={`${r.id}: ${r.tracked ? "izlemeyi bırak" : "izle"}`} />
                <span className="min-w-0 flex-1 truncate text-[14px]">{r.id}</span>
                {r.private && <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--fx-text-3)]" aria-label="gizli depo" />}
                <span className="fx-num shrink-0 text-[10.5px] text-[var(--fx-text-3)]">{r.pushedAt ? formatTrDate(r.pushedAt.slice(0, 10)).toLocaleUpperCase("tr-TR") : ""}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] text-[var(--fx-text-3)]">Dokunarak seçin; seçilen depo hemen okunur. Yalnızca okunur, hiçbir depoya yazılmaz.</p>
        </GlassCard>
      )}

      {tracked.map((p, i) => (
        <ProjectCard key={p.id} project={p} index={i + 2} busy={busy} onRefresh={() => void load({ yenile: true })} />
      ))}
      {data.configured && tracked.length === 0 && data.repos.length > 0 && <p className="text-center text-[13px] text-[var(--fx-text-3)]">Yukarıdan izlemek istediğiniz depoları seçin.</p>}
    </div>
  );
}

function HeadsUp() {
  const [hidden, setHidden] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(NOTE_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  return (
    <Notice
      tone="bilgi"
      action={
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(NOTE_KEY, "1");
            } catch {
              // önemli değil
            }
            setHidden(true);
          }}
          className="fx-chip"
        >
          Anladım
        </button>
      }
    >
      <p className="font-medium text-[var(--fx-text)]">Bilmeniz gereken iki şey</p>
      <p className="mt-1">GitHub’da yalnızca commit edilip gönderilmiş iş görünür. Mac’inizdeki kaydedilmemiş değişiklikler burada YOK (Routinix Kampüs için elle çalışan “yerel özet” komutu ayrı etiketle gösterilir).</p>
      <p className="mt-1">Anahtar sunucuda durur. Site ele geçirilirse biri bu depoları OKUYABİLİR ama değiştiremez.</p>
    </Notice>
  );
}

function SetupCard() {
  return (
    <GlassCard accent={ACCENT} index={1}>
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-[var(--fx-proje)]" />
        <CardLabel>GitHub anahtarı (bir kez kurulur)</CardLabel>
      </div>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13.5px] leading-snug text-[var(--fx-text-2)]">
        <li>GitHub → profil resmi → Settings → Developer settings → Personal access tokens → <b>Fine-grained tokens</b> → Generate new token.</li>
        <li>Resource owner: kendi hesabınız. Expiration: <b>mümkün olan en uzunu</b> (genelde 1 yıl) — bitiş tarihini not edin, o gün yenilemeniz gerekir.</li>
        <li>Repository access: <b>Only select repositories</b> → izlemek istediğiniz depolar (Routinix Kampüs dahil).</li>
        <li>Permissions → Repository permissions, YALNIZCA şunlar <b>Read-only</b>: Contents, Metadata, Pull requests, Commit statuses, Checks. Başka bir şey vermeyin (yazma yetkisi yok).</li>
        <li>Generate token → <b>ghp_/github_pat_ ile başlayan metni kopyalayın</b> (bir daha gösterilmez).</li>
        <li>Vercel → projeniz → Settings → Environment Variables → <code>GITHUB_TOKEN</code> adıyla ekleyin (Production + Preview) → Redeploy.</li>
      </ol>
      <p className="mt-3 text-[12px] text-[var(--fx-text-3)]">Anahtarı sohbete ya da GitHub’a yazmayın; yalnızca Vercel’e girin. İstemciye (telefona) hiç gitmez.</p>
    </GlassCard>
  );
}

function ProjectCard({ project: p, index, busy, onRefresh }: { project: ProjectView; index: number; busy: boolean; onRefresh: () => void }) {
  const g = p.github;
  const l = p.local;
  const [open, setOpen] = useState(false);
  const c = countTasks(g?.tasks ?? null);
  const pending = (g?.tasks ?? []).filter((t) => t.status !== "bitti");
  const waiting = g?.branches.filter((b) => b.ci === "bekliyor") ?? [];
  return (
    <GlassCard accent={ACCENT} index={index}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-medium">{shortName(p.id)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {g && (
              <span className="fx-chip !h-6 !text-[10px]" style={{ ["--accent" as string]: p.stale ? "var(--fx-program)" : "var(--fx-proje)" }}>
                GitHub · {dateText(g.fetchedAt)}
                {p.stale ? " · eski" : ""}
              </span>
            )}
            {l && (
              <span className="fx-chip !h-6 !text-[10px]" style={{ ["--accent" as string]: "var(--fx-hafiza)" }}>
                <Laptop className="h-3 w-3" /> Yerel (Mac) · {dateText(l.fetchedAt)}
              </span>
            )}
            {!g && <span className="fx-chip !h-6 !text-[10px]">GitHub verisi yok</span>}
          </div>
        </div>
        <button type="button" onClick={onRefresh} disabled={busy} aria-label="GitHub'dan yenile" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 disabled:opacity-40">
          <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />
        </button>
      </div>

      {g?.lastError && <p className="mt-2 text-[12px] text-[var(--fx-program)]">Son yenileme başarısız ({g.lastError.message}) — {dateText(g.fetchedAt)} tarihli durum gösteriliyor.</p>}

      {g && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Tile label="Bekleyen iş" value={g.tasks === null ? "?" : String(c.todo + c.doing)} />
            <Tile label="Testte dal" value={String(waiting.length)} tone={waiting.length ? "--fx-program" : undefined} />
            <Tile label="Ana dal testi" value={CI_LABELS[g.defaultCi].replace("test ", "")} tone={CI_COLOR[g.defaultCi]} />
          </div>

          <div className="mt-3">
            <p className="fx-num text-[10px] uppercase tracking-[0.12em] text-[var(--fx-text-3)]">
              Görevler {g.tasks === null ? "· ana dalda tasks.json yok — bilmiyorum" : `· ana dalda ${c.done} bitti`}
            </p>
            {pending.length > 0 && (
              <ul className="mt-1.5 space-y-1">
                {pending.slice(0, open ? 30 : 5).map((t, i) => (
                  <li key={i} className="flex items-baseline gap-2 text-[13.5px]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: t.status === "devam" ? "var(--fx-program)" : "var(--fx-text-3)" }} />
                    <span className="min-w-0 flex-1">{t.title}</span>
                    <span className="fx-num shrink-0 text-[10px] text-[var(--fx-text-3)]">{t.status === "devam" ? "DEVAM" : "BEKLİYOR"}</span>
                  </li>
                ))}
              </ul>
            )}
            {g.tasks !== null && pending.length === 0 && <p className="mt-1 text-[13px] text-[var(--fx-text-3)]">Bekleyen iş yok.</p>}
          </div>

          {g.branches.length > 0 && (
            <div className="mt-3">
              <p className="fx-num text-[10px] uppercase tracking-[0.12em] text-[var(--fx-text-3)]">Ana dala girmemiş dallar</p>
              <ul className="mt-1.5 space-y-1.5">
                {g.branches.map((b) => (
                  <li key={b.name} className="flex items-center gap-2 text-[13px]">
                    {b.pr ? <GitPullRequest className="h-3.5 w-3.5 shrink-0 text-[var(--fx-proje)]" /> : <GitBranch className="h-3.5 w-3.5 shrink-0 text-[var(--fx-text-3)]" />}
                    <span className="min-w-0 flex-1 truncate">{b.pr ? `#${b.pr.number} ${b.pr.title}` : b.name}</span>
                    <CiChip ci={b.ci} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-3 flex items-center gap-1 text-[12px] text-[var(--fx-text-2)]">
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} /> Son commit’ler ve durum başlıkları
          </button>
          {open && (
            <div className="mt-2 space-y-2 text-[12.5px] text-[var(--fx-text-2)]">
              <ul className="space-y-1">
                {g.commits.map((cm, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="fx-num w-[58px] shrink-0 text-[10.5px] text-[var(--fx-text-3)]">{cm.date ? formatTrDate(cm.date.slice(0, 10)).toLocaleUpperCase("tr-TR") : ""}</span>
                    <span className="min-w-0 flex-1">{cm.message}</span>
                  </li>
                ))}
              </ul>
              {g.stateHeadings && g.stateHeadings.length > 0 && <p className="text-[var(--fx-text-3)]">PROJECT_STATE.md: {g.stateHeadings.join(" · ")}</p>}
              <p className="text-[var(--fx-text-3)]">Son push: {dateText(g.pushedAt)} · ana dal: {g.defaultBranch}</p>
            </div>
          )}
        </>
      )}

      {l && (
        <div className="mt-3 rounded-[14px] bg-white/[0.04] px-3 py-2 text-[12.5px] text-[var(--fx-text-2)]">
          <p className="fx-num text-[10px] uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--fx-hafiza)_80%,white)]">Yerel · {dateText(l.fetchedAt)} · elle güncellenir</p>
          <p className="mt-1">
            {l.dirtyCount === null ? "git durumu okunamadı" : l.dirtyCount ? `${l.dirtyCount} kaydedilmemiş değişiklik (GitHub’da yok)` : "kaydedilmemiş değişiklik yok"}
            {l.branch ? ` · dal: ${l.branch}` : ""}
            {l.tasks ? ` · ${l.tasks.filter((t) => t.status !== "bitti").length} açık görev (yerel dosya)` : ""}
          </p>
        </div>
      )}
    </GlassCard>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[14px] bg-white/[0.04] px-2 py-2">
      <p className="fx-num text-[17px] leading-none" style={tone ? { color: `var(${tone})` } : undefined}>
        {value}
      </p>
      <p className="mt-1 text-[9.5px] uppercase tracking-[0.1em] text-[var(--fx-text-3)]">{label}</p>
    </div>
  );
}
