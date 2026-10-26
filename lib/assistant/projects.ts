import { parseHeadings, parseTasks, type TaskStatus } from "../../scripts/proje-ayristir.mjs";
import { formatTrDate } from "./text";

// Proje durumu (Faz 5) — saf tipler ve özetleyiciler. Veri GitHub'dan (lib/server/github.ts)
// ya da Mac betiğinden (scripts/proje-ozeti.mjs) gelir; burada yalnızca BAŞLIK ve DURUM var.
// GİZLİLİK: modele (describeProjectsForModel) yalnızca görev başlıkları, durumlar, dal adları ve
// test durumu gider — kod, dosya içeriği, commit mesajı ve PROJECT_STATE.md metni ASLA.

export { parseHeadings, parseTasks };
export type { TaskStatus };

export const CACHE_MINUTES = 15;
/** "yenile" düğmesi arka arkaya basılırsa GitHub'a en fazla bu aralıkta bir gidilir. */
export const FORCE_MIN_SECONDS = 60;

export type CiState = "bekliyor" | "gecti" | "kaldi" | "yok";

export interface ProjectTask {
  title: string;
  status: TaskStatus;
}

export interface BranchInfo {
  name: string;
  /** Ana dalın kaç commit önünde */
  ahead: number;
  ci: CiState;
  pr: { number: number; title: string } | null;
  updatedAt: string | null;
}

export interface GithubData {
  repo: string;
  private: boolean;
  defaultBranch: string;
  fetchedAt: string;
  /** Ana dalın son commit tarihi */
  pushedAt: string | null;
  /** null = ana dalda tasks.json yok */
  tasks: ProjectTask[] | null;
  /** PROJECT_STATE.md başlıkları (yalnızca ekranda; modele gitmez). null = dosya yok */
  stateHeadings: string[] | null;
  /** Son commit'ler — yalnızca ekranda; modele gitmez */
  commits: { date: string; message: string }[];
  defaultCi: CiState;
  branches: BranchInfo[];
  /** Son yenilemede GitHub'a ulaşılamadıysa: bu veri eski */
  lastError: { at: string; message: string } | null;
}

export interface LocalData {
  repo: string;
  fetchedAt: string;
  tasks: ProjectTask[] | null;
  stateHeadings: string[] | null;
  /** Kaydedilmemiş değişiklik SAYISI (dosya adı yok) */
  dirtyCount: number | null;
  branch: string | null;
}

export interface RepoEntry {
  id: string;
  private: boolean;
  pushedAt: string | null;
  tracked: boolean;
}

export interface ProjectView {
  id: string;
  github: GithubData | null;
  local: LocalData | null;
  /** GitHub verisi şu an eski mi (önbellek süresi geçmiş ya da yenileme başarısız) */
  stale: boolean;
}

export function countTasks(tasks: ProjectTask[] | null) {
  const t = tasks ?? [];
  return { done: t.filter((x) => x.status === "bitti").length, doing: t.filter((x) => x.status === "devam").length, todo: t.filter((x) => x.status === "bekliyor").length, total: t.length };
}

export function shortName(id: string): string {
  return id.includes("/") ? id.slice(id.indexOf("/") + 1) : id;
}

export const CI_LABELS: Record<CiState, string> = { bekliyor: "test bekliyor", gecti: "test geçti", kaldi: "test kaldı", yok: "test yok" };

const day = (iso: string | null) => (iso ? formatTrDate(iso.slice(0, 10)) : "?");

/**
 * Modele giden proje bölümü. Üç ayrı durum, birbirine karıştırılmaz:
 * "ana dalda: bitti", "dalda, test bekliyor", "GitHub'da yok: bilmiyorum".
 */
export function describeProjectsForModel(projects: ProjectView[], opts: { maxTasks?: number } = {}): string {
  const maxTasks = opts.maxTasks ?? 5;
  if (!projects.length) return "Projeler: izlenen proje yok (Projeler sekmesinden seçilir) — proje durumu bilinmiyor.";
  const lines = ["Projeler (GitHub'daki son duruma göre; kaydedilmemiş yerel işi bilmiyorsun, uydurma):"];
  for (const p of projects) {
    const name = shortName(p.id);
    if (!p.github) {
      lines.push(`- ${name}: GitHub verisi yok — bilmiyorum.`);
    } else {
      const g = p.github;
      const c = countTasks(g.tasks);
      const open = (g.tasks ?? []).filter((t) => t.status !== "bitti");
      const head = `- ${name} (GitHub, güncelleme ${day(g.fetchedAt)}${p.stale ? ", ESKİ — GitHub'a ulaşılamadı" : ""}):`;
      const tasks =
        g.tasks === null
          ? "tasks.json yok — görev durumu bilinmiyor"
          : `ana dalda ${c.done} görev bitti, ${c.doing} devam, ${c.todo} bekliyor${open.length ? `; açık: ${open.slice(0, maxTasks).map((t) => `${t.title} [${t.status}]`).join("; ")}${open.length > maxTasks ? ` (+${open.length - maxTasks})` : ""}` : ""}`;
      lines.push(`${head} ${tasks}. Ana dal ${CI_LABELS[g.defaultCi]}.`);
      for (const b of g.branches.slice(0, 5)) lines.push(`  · dalda: ${b.name}${b.pr ? ` (PR: ${b.pr.title.slice(0, 60)})` : ""} — ${CI_LABELS[b.ci]}`);
    }
    if (p.local) {
      const l = p.local;
      lines.push(`  · yerel Mac özeti (${day(l.fetchedAt)}, elle güncellenir): ${l.dirtyCount ? `${l.dirtyCount} kaydedilmemiş değişiklik — GitHub'da yok, durumunu bilmiyorum` : "kaydedilmemiş değişiklik yok"}.`);
    }
  }
  return lines.join("\n");
}

/** Günlük özet bölümü (ekran + sohbet bağlamı): kısa sayılar, kodla. */
export interface ProjectsBrief {
  /** token-yok: GitHub anahtarı eklenmemiş; secim-yok: depo seçilmemiş; hazir */
  status: "bagli-degil" | "secim-yok" | "hazir";
  items: { id: string; name: string; open: number; waiting: number; failed: number; updatedAt: string | null; stale: boolean }[];
}

export function buildProjectsBrief(projects: ProjectView[], configured: boolean): ProjectsBrief {
  if (!configured) return { status: "bagli-degil", items: [] };
  if (!projects.length) return { status: "secim-yok", items: [] };
  return {
    status: "hazir",
    items: projects.map((p) => ({
      id: p.id,
      name: shortName(p.id),
      open: (p.github?.tasks ?? []).filter((t) => t.status !== "bitti").length,
      waiting: p.github?.branches.filter((b) => b.ci === "bekliyor").length ?? 0,
      failed: p.github?.branches.filter((b) => b.ci === "kaldi").length ?? 0,
      updatedAt: p.github?.fetchedAt ?? null,
      stale: p.stale,
    })),
  };
}
