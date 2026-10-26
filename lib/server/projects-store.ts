import type { Client } from "@libsql/client";
import { CACHE_MINUTES, buildProjectsBrief, type GithubData, type LocalData, type ProjectView, type RepoEntry } from "@/lib/assistant/projects";

// Proje durumu: izlenen depolar `projects` tablosunda (id = "kullanici/depo", tracked), son okunan
// durum `project_state` tablosunda (source = 'github' | 'yerel'). Önbellek ~15 dk; yalnızca
// birisi ekranı/özeti isteyince tazelenir — arka planda otomatik çalışan bir şey YOK.
// GitHub'a ulaşılamazsa son kaydedilen durum gösterilir (lastError ile işaretli).

export const REPOS_KEY = "_repos";

const parse = <T>(v: unknown): T | null => {
  try {
    return typeof v === "string" ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
};

export async function getState<T>(db: Client, id: string, source: "github" | "yerel"): Promise<{ data: T; fetchedAt: string } | null> {
  const r = (await db.execute({ sql: `SELECT data, fetched_at FROM project_state WHERE project_id = ? AND source = ?`, args: [id, source] })).rows[0];
  const data = r ? parse<T>(r.data) : null;
  return data ? { data, fetchedAt: String(r.fetched_at) } : null;
}

export async function putState(db: Client, id: string, source: "github" | "yerel", data: unknown, at: string) {
  await db.execute({
    sql: `INSERT INTO project_state (project_id, source, data, fetched_at) VALUES (?, ?, ?, ?) ON CONFLICT(project_id, source) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`,
    args: [id, source, JSON.stringify(data), at],
  });
}

export async function listTrackedIds(db: Client): Promise<string[]> {
  return (await db.execute(`SELECT id FROM projects WHERE tracked = 1 ORDER BY id`)).rows.map((r) => String(r.id));
}

export async function setTracked(db: Client, id: string, tracked: boolean): Promise<boolean> {
  const res = await db.execute({ sql: `UPDATE projects SET tracked = ? WHERE id = ?`, args: [tracked ? 1 : 0, id] });
  return res.rowsAffected > 0;
}

/** Kayıtlı depo listesi (seçim ekranı) — GitHub'dan en son okunan + izleme durumu. */
export async function getRepoList(db: Client): Promise<{ repos: RepoEntry[]; fetchedAt: string | null }> {
  const saved = await getState<Omit<RepoEntry, "tracked">[]>(db, REPOS_KEY, "github");
  const tracked = new Set(await listTrackedIds(db));
  return { repos: (saved?.data ?? []).map((r) => ({ ...r, tracked: tracked.has(r.id) })), fetchedAt: saved?.fetchedAt ?? null };
}

const ageSeconds = (iso: string, now: Date) => (now.getTime() - Date.parse(iso)) / 1000;

/** İzlenen projelerin saklı durumu (GitHub + yerel). Ağa HİÇ gitmez — günlük özet ve sohbet bağlamı bunu kullanır. */
export async function getProjectViews(db: Client, now = new Date()): Promise<ProjectView[]> {
  const out: ProjectView[] = [];
  for (const id of await listTrackedIds(db)) {
    const [g, l] = await Promise.all([getState<GithubData>(db, id, "github"), getState<LocalData>(db, id, "yerel")]);
    const github = g ? { ...g.data, fetchedAt: g.fetchedAt } : null;
    out.push({
      id,
      github,
      local: l ? { ...l.data, fetchedAt: l.fetchedAt } : null,
      stale: !github || Boolean(github.lastError) || ageSeconds(github.fetchedAt, now) >= CACHE_MINUTES * 60,
    });
  }
  return out;
}

export async function getProjectsBrief(db: Client, configured: boolean, now = new Date()) {
  return buildProjectsBrief(await getProjectViews(db, now), configured);
}
