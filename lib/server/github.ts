import "server-only";
import type { BranchInfo, CiState, GithubData, ProjectTask, RepoEntry } from "@/lib/assistant/projects";
import { parseHeadings, parseTasks } from "@/lib/assistant/projects";

// GitHub okuyucu (Faz 5) — YALNIZCA OKUR: bu dosyada yalnızca GET istekleri var, hiçbir projeye
// yazma yok. Anahtar GITHUB_TOKEN ortam değişkeninde (fine-grained, yalnızca seçili depolar,
// yalnızca okuma) ve istemciye hiç gitmez. Test için `GhFetch` enjekte edilir.

export type GhResponse = { status: number; body: unknown; text?: string };
/** `raw: true` → ham dosya içeriği (Accept: application/vnd.github.raw) */
export type GhFetch = (path: string, opts?: { raw?: boolean }) => Promise<GhResponse>;

const GITHUB_API = "https://api.github.com";
/** Yalnızca yerel uçtan uca test için (Gemini'dekiyle aynı mantık); Vercel'de yok sayılır. */
const API_BASE = !process.env.VERCEL && process.env.GITHUB_API_BASE ? process.env.GITHUB_API_BASE : GITHUB_API;

export class GithubError extends Error {
  constructor(
    message: string,
    public code: "token-yok" | "yetki" | "limit" | "ag" | "hata",
  ) {
    super(message);
  }
}

export function isGithubConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

export function realGhFetch(token = process.env.GITHUB_TOKEN): GhFetch {
  return async (path, opts) => {
    if (!token) throw new GithubError("GITHUB_TOKEN yok.", "token-yok");
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method: "GET",
        headers: { "User-Agent": "MertOS-asistan", Authorization: `Bearer ${token}`, Accept: opts?.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new GithubError("GitHub'a ulaşılamadı.", "ag");
    }
    if (res.status === 401) throw new GithubError("GitHub anahtarı geçersiz ya da süresi dolmuş.", "yetki");
    if (res.status === 403 || res.status === 429) {
      const limited = res.headers.get("x-ratelimit-remaining") === "0" || res.status === 429;
      throw new GithubError(limited ? "GitHub istek sınırı doldu, biraz sonra yeniden denenecek." : "GitHub bu isteğe izin vermedi (anahtarın yetkisi yetersiz).", limited ? "limit" : "yetki");
    }
    if (opts?.raw) return { status: res.status, body: null, text: res.ok ? await res.text() : undefined };
    return { status: res.status, body: res.ok ? await res.json().catch(() => null) : null };
  };
}

type Json = Record<string, unknown>;
const asArray = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

/** Anahtarın görebildiği depolar (sahip + iş birliği + organizasyon), son push'a göre. */
export async function listRepos(gh: GhFetch): Promise<Omit<RepoEntry, "tracked">[]> {
  const out: Omit<RepoEntry, "tracked">[] = [];
  for (let page = 1; page <= 3; page++) {
    const r = await gh(`/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner,collaborator,organization_member`);
    if (r.status !== 200) throw new GithubError(`Depolar listelenemedi (${r.status}).`, "hata");
    const rows = asArray(r.body);
    for (const x of rows) if (str(x.full_name) && !x.archived) out.push({ id: String(x.full_name), private: Boolean(x.private), pushedAt: str(x.pushed_at) });
    if (rows.length < 100) break;
  }
  return out;
}

/** Bir commit/dal ucu için test (CI) durumu: kaldı > bekliyor > geçti; hiç test yoksa "yok". */
export async function ciState(gh: GhFetch, repo: string, ref: string): Promise<CiState> {
  const enc = encodeURIComponent(ref);
  const [status, runs] = await Promise.all([gh(`/repos/${repo}/commits/${enc}/status`), gh(`/repos/${repo}/commits/${enc}/check-runs?per_page=50`)]);
  const states: CiState[] = [];
  const combined = status.status === 200 ? (status.body as Json) : null;
  if (combined && Number(combined.total_count) > 0) {
    const s = str(combined.state);
    states.push(s === "success" ? "gecti" : s === "pending" ? "bekliyor" : "kaldi");
  }
  const checks = runs.status === 200 ? asArray((runs.body as Json).check_runs) : [];
  for (const c of checks) {
    if (c.status !== "completed") states.push("bekliyor");
    else {
      const k = str(c.conclusion);
      states.push(k === "success" || k === "neutral" || k === "skipped" ? "gecti" : "kaldi");
    }
  }
  if (states.includes("kaldi")) return "kaldi";
  if (states.includes("bekliyor")) return "bekliyor";
  return states.length ? "gecti" : "yok";
}

async function fileText(gh: GhFetch, repo: string, path: string, ref: string): Promise<string | null> {
  const r = await gh(`/repos/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`, { raw: true });
  return r.status === 200 && typeof r.text === "string" ? r.text : null;
}

const MAX_BRANCHES = 10;

/** Bir deponun durumunu okur: ana dalda tasks.json + PROJECT_STATE.md, son commit'ler, dallar + PR'lar + test durumları. */
export async function fetchRepoState(gh: GhFetch, repo: string, now = new Date()): Promise<GithubData> {
  const info = await gh(`/repos/${repo}`);
  if (info.status === 404) throw new GithubError(`${repo} bulunamadı ya da anahtar bu depoyu görmüyor.`, "yetki");
  if (info.status !== 200) throw new GithubError(`${repo} okunamadı (${info.status}).`, "hata");
  const meta = info.body as Json;
  const defaultBranch = str(meta.default_branch) ?? "main";

  const [tasksText, stateText, commitsRes, branchesRes, pullsRes, defaultCi] = await Promise.all([
    fileText(gh, repo, "tasks.json", defaultBranch),
    fileText(gh, repo, "PROJECT_STATE.md", defaultBranch),
    gh(`/repos/${repo}/commits?sha=${encodeURIComponent(defaultBranch)}&per_page=5`),
    gh(`/repos/${repo}/branches?per_page=30`),
    gh(`/repos/${repo}/pulls?state=open&per_page=30`),
    ciState(gh, repo, defaultBranch),
  ]);

  const commits = (commitsRes.status === 200 ? asArray(commitsRes.body) : []).map((c) => {
    const commit = (c.commit ?? {}) as Json;
    const committer = (commit.committer ?? {}) as Json;
    return { date: str(committer.date) ?? "", message: (str(commit.message) ?? "").split("\n")[0].slice(0, 90) };
  });

  const prByBranch = new Map<string, { number: number; title: string }>();
  for (const p of pullsRes.status === 200 ? asArray(pullsRes.body) : []) {
    const head = (p.head ?? {}) as Json;
    if (str(head.ref) && !prByBranch.has(String(head.ref))) prByBranch.set(String(head.ref), { number: Number(p.number), title: String(p.title ?? "").slice(0, 100) });
  }

  const names = asArray(branchesRes.status === 200 ? branchesRes.body : []).map((b) => String(b.name)).filter((n) => n !== defaultBranch);
  // PR'ı olan dallar önce; en çok MAX_BRANCHES dal incelenir (istek sayısını sınırlar).
  names.sort((a, b) => Number(prByBranch.has(b)) - Number(prByBranch.has(a)));
  const branches: BranchInfo[] = [];
  await Promise.all(
    names.slice(0, MAX_BRANCHES).map(async (name) => {
      const cmp = await gh(`/repos/${repo}/compare/${encodeURIComponent(defaultBranch)}...${encodeURIComponent(name)}`);
      if (cmp.status !== 200) return;
      const body = cmp.body as Json;
      const ahead = Number(body.ahead_by) || 0;
      if (ahead === 0 && !prByBranch.has(name)) return; // ana dala işlenmiş eski dal
      const last = asArray(body.commits).at(-1);
      const updatedAt = str((((last?.commit ?? {}) as Json).committer as Json | undefined)?.date);
      branches.push({ name, ahead, ci: await ciState(gh, repo, name), pr: prByBranch.get(name) ?? null, updatedAt });
    }),
  );
  branches.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

  const tasks: ProjectTask[] | null = tasksText === null ? null : parseTasks(tasksText);
  return {
    repo,
    private: Boolean(meta.private),
    defaultBranch,
    fetchedAt: now.toISOString(),
    pushedAt: commits[0]?.date || str(meta.pushed_at),
    tasks,
    stateHeadings: stateText === null ? null : parseHeadings(stateText),
    commits,
    defaultCi,
    branches,
    lastError: null,
  };
}
