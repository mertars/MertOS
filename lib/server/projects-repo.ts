import type { Client } from "@libsql/client";
import { CACHE_MINUTES, FORCE_MIN_SECONDS, type GithubData } from "@/lib/assistant/projects";
import { fetchRepoState, GithubError, listRepos, type GhFetch } from "./github";
import { getState, listTrackedIds, putState, REPOS_KEY } from "./projects-store";

// Proje durumunu GitHub'dan TAZELER (ağa gider; yalnızca ekran/API isteyince — arka planda otomatik çalışan yok).
// Saklı durumu okuyan kısım ağa gitmez: projects-store.ts.

/** GitHub'dan depo listesini okur, `projects`e yeni olanları (izlenmeyen) ekler, listeyi saklar. */
export async function refreshRepoList(db: Client, gh: GhFetch, now = new Date()) {
  const repos = await listRepos(gh);
  const at = now.toISOString();
  await db.batch(repos.map((r) => ({ sql: `INSERT OR IGNORE INTO projects (id, name, source, tracked, added_at) VALUES (?, ?, 'github', 0, ?)`, args: [r.id, r.id, at] })), "write");
  await putState(db, REPOS_KEY, "github", repos, at);
}

const ageSeconds = (iso: string, now: Date) => (now.getTime() - Date.parse(iso)) / 1000;

export interface RefreshResult {
  /** GitHub'a gidilen depolar */
  fetched: string[];
  errors: { id: string; message: string; code: string }[];
}

/**
 * İzlenen depoları tazeler. `force`: ekrandaki "Yenile" (yine de 60 sn'de bir). Yoksa yalnızca önbelleği
 * 15 dk'dan eski olanlar. Hata olursa eski durum silinmez, `lastError` ile işaretlenir.
 */
export async function refreshTracked(db: Client, gh: GhFetch, opts: { force?: boolean; now?: Date } = {}): Promise<RefreshResult> {
  const now = opts.now ?? new Date();
  const result: RefreshResult = { fetched: [], errors: [] };
  for (const id of await listTrackedIds(db)) {
    const saved = await getState<GithubData>(db, id, "github");
    const age = saved ? ageSeconds(saved.fetchedAt, now) : Infinity;
    // Başarısız bir denemeden sonra da 60 sn beklenir (fetchedAt'i değiştirmeyen hata kaydı için lastError.at).
    const lastTry = saved?.data.lastError ? Math.min(age, ageSeconds(saved.data.lastError.at, now)) : age;
    const due = opts.force ? lastTry >= FORCE_MIN_SECONDS : age >= CACHE_MINUTES * 60 && lastTry >= FORCE_MIN_SECONDS;
    if (!due) continue;
    try {
      const data = await fetchRepoState(gh, id, now);
      await putState(db, id, "github", data, now.toISOString());
      result.fetched.push(id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Bilinmeyen hata";
      const code = e instanceof GithubError ? e.code : "hata";
      result.errors.push({ id, message, code });
      if (saved) await putState(db, id, "github", { ...saved.data, lastError: { at: now.toISOString(), message } }, saved.fetchedAt);
      // Anahtar yok/geçersiz ya da limit dolu: kalan depolara da gitmenin anlamı yok.
      if (code === "token-yok" || code === "yetki" || code === "limit" || code === "ag") break;
    }
  }
  return result;
}

