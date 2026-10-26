import { vi } from "vitest";
vi.mock("server-only", () => ({}));
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { describeProjectsForModel } from "@/lib/assistant/projects";
import { parseHeadings, parseTasks, repoFromRemote } from "../../scripts/proje-ozeti.mjs";
import { prepareDatabase } from "./db-core";
import { ciState, fetchRepoState, GithubError, realGhFetch, type GhFetch } from "./github";
import { getProjectViews, getRepoList, setTracked } from "./projects-store";
import { refreshRepoList, refreshTracked } from "./projects-repo";

// Faz 5 — GitHub okuyucu KOD YOLU testleri, SAHTE GitHub ile. Gerçek GitHub denemesi ayrı raporlanır.

type Route = unknown | ((path: string) => unknown);
function fakeGh(routes: Record<string, Route>, calls: string[] = []): GhFetch {
  return async (path, opts) => {
    calls.push(path);
    const key = Object.keys(routes).find((k) => path.startsWith(k));
    if (!key) return { status: 404, body: null };
    const v = typeof routes[key] === "function" ? (routes[key] as (p: string) => unknown)(path) : routes[key];
    if (v && typeof v === "object" && "__status" in (v as object)) return { status: (v as { __status: number }).__status, body: null };
    return opts?.raw ? { status: 200, body: null, text: v as string } : { status: 200, body: v };
  };
}
const checks = (...c: [string, string | null][]) => ({ check_runs: c.map(([status, conclusion]) => ({ status, conclusion })) });
const noStatus = { total_count: 0, state: "pending" };

describe("ciState — bekliyor / geçti / kaldı", () => {
  const ci = (status: unknown, runs: unknown) => ciState(fakeGh({ "/repos/a/b/commits/x/status": status, "/repos/a/b/commits/x/check-runs": runs }), "a/b", "x");
  it("hepsi başarılı → geçti", async () => expect(await ci(noStatus, checks(["completed", "success"], ["completed", "skipped"]))).toBe("gecti"));
  it("biri sürüyor → bekliyor", async () => expect(await ci(noStatus, checks(["completed", "success"], ["in_progress", null]))).toBe("bekliyor"));
  it("biri başarısız → kaldı (bekleyen olsa bile)", async () => expect(await ci(noStatus, checks(["queued", null], ["completed", "failure"]))).toBe("kaldi"));
  it("eski stil durum: pending/failure/success", async () => {
    expect(await ci({ total_count: 2, state: "pending" }, checks())).toBe("bekliyor");
    expect(await ci({ total_count: 2, state: "failure" }, checks())).toBe("kaldi");
    expect(await ci({ total_count: 1, state: "success" }, checks())).toBe("gecti");
  });
  it("hiç test yok → yok (boş 'pending' bekliyor sayılmaz)", async () => expect(await ci(noStatus, checks())).toBe("yok"));
});

describe("parseTasks / parseHeadings / repoFromRemote", () => {
  it("tasks.json biçimleri: dizi, {tasks}, durum adları; iptal atlanır", () => {
    expect(parseTasks(JSON.stringify([{ title: "A", status: "done" }, { name: "B", status: "in_progress" }, { task: "C" }, { title: "D", status: "cancelled" }, "E", { title: "F", done: true }]))).toEqual([
      { title: "A", status: "bitti" },
      { title: "B", status: "devam" },
      { title: "C", status: "bekliyor" },
      { title: "E", status: "bekliyor" },
      { title: "F", status: "bitti" },
    ]);
    expect(parseTasks(JSON.stringify({ tasks: [{ title: "X", state: "Tamam" }] }))).toEqual([{ title: "X", status: "bitti" }]);
    expect(parseTasks("{bozuk")).toBeNull();
  });
  it("görev gövdesi/açıklaması alınmaz — yalnızca başlık ve durum", () => {
    const t = parseTasks(JSON.stringify([{ title: "KVKK metni hazırla", status: "todo", description: "GİZLİ AÇIKLAMA", body: "gizli" }]))!;
    expect(JSON.stringify(t)).not.toMatch(/GİZLİ|gizli/);
  });
  it("PROJECT_STATE.md yalnızca başlıklar", () => {
    expect(parseHeadings("# Durum\ngizli paragraf\n## Sıradaki\n- madde\n### Alt ##")).toEqual(["Durum", "Sıradaki", "Alt"]);
  });
  it("remote adresi", () => {
    expect(repoFromRemote("git@github.com:mertars/routinix.git")).toBe("mertars/routinix");
    expect(repoFromRemote("https://github.com/mertars/routinix")).toBe("mertars/routinix");
    expect(repoFromRemote("https://gitlab.com/a/b")).toBeNull();
  });
});

const repoRoutes = (over: Record<string, Route> = {}): Record<string, Route> => ({
  "/repos/m/gizli/contents/tasks.json": JSON.stringify([{ title: "Giriş ekranı", status: "done" }, { title: "KVKK metni", status: "todo" }, { title: "Bildirimler", status: "doing" }]),
  "/repos/m/gizli/contents/PROJECT_STATE.md": "# Durum\ngizli içerik\n",
  "/repos/m/gizli/commits?": [{ commit: { message: "Giriş eklendi\n\nayrıntı", committer: { date: "2026-10-25T10:00:00Z" } } }],
  "/repos/m/gizli/branches": [{ name: "main" }, { name: "feat-bildirim" }, { name: "eski-dal" }],
  "/repos/m/gizli/pulls": [{ number: 4, title: "Bildirimler", head: { ref: "feat-bildirim" } }],
  "/repos/m/gizli/compare/main...feat-bildirim": { ahead_by: 3, commits: [{ commit: { committer: { date: "2026-10-26T09:00:00Z" } } }] },
  "/repos/m/gizli/compare/main...eski-dal": { ahead_by: 0, commits: [] },
  "/repos/m/gizli/commits/main/status": noStatus,
  "/repos/m/gizli/commits/main/check-runs": checks(["completed", "success"]),
  "/repos/m/gizli/commits/feat-bildirim/status": noStatus,
  "/repos/m/gizli/commits/feat-bildirim/check-runs": checks(["in_progress", null]),
  "/repos/m/gizli": { private: true, default_branch: "main", pushed_at: "2026-10-26T09:00:00Z" },
  ...over,
});

describe("fetchRepoState", () => {
  it("gizli depo: görevler, dallar (ana dala işlenmiş olan atlanır), PR, test durumları", async () => {
    const d = await fetchRepoState(fakeGh(repoRoutes()), "m/gizli", new Date("2026-10-26T12:00:00Z"));
    expect(d.private).toBe(true);
    expect(d.tasks).toEqual([
      { title: "Giriş ekranı", status: "bitti" },
      { title: "KVKK metni", status: "bekliyor" },
      { title: "Bildirimler", status: "devam" },
    ]);
    expect(d.stateHeadings).toEqual(["Durum"]);
    expect(d.commits).toEqual([{ date: "2026-10-25T10:00:00Z", message: "Giriş eklendi" }]);
    expect(d.defaultCi).toBe("gecti");
    expect(d.branches).toEqual([{ name: "feat-bildirim", ahead: 3, ci: "bekliyor", pr: { number: 4, title: "Bildirimler" }, updatedAt: "2026-10-26T09:00:00Z" }]);
  });
  it("tasks.json yoksa tasks null (bilmiyorum), depo yoksa yetki hatası", async () => {
    const d = await fetchRepoState(fakeGh(repoRoutes({ "/repos/m/gizli/contents/tasks.json": { __status: 404 } })), "m/gizli");
    expect(d.tasks).toBeNull();
    await expect(fetchRepoState(fakeGh({}), "m/yok")).rejects.toMatchObject({ code: "yetki" });
  });
  it("YALNIZCA GET: yazma yolu yok", async () => {
    const calls: string[] = [];
    await fetchRepoState(fakeGh(repoRoutes(), calls), "m/gizli");
    expect(calls.length).toBeGreaterThan(5);
    expect(calls.every((c) => c.startsWith("/repos/m/gizli"))).toBe(true);
  });
});

describe("realGhFetch", () => {
  it("anahtar yoksa ağa gitmeden token-yok; yalnızca GET ve Bearer başlığı", async () => {
    await expect(realGhFetch("")("/user/repos")).rejects.toMatchObject({ code: "token-yok" });
    const seen: RequestInit[] = [];
    const orig = globalThis.fetch;
    globalThis.fetch = (async (_u: string, init: RequestInit) => (seen.push(init), new Response("{}", { status: 200 }))) as typeof fetch;
    try {
      await realGhFetch("ghp_test")("/user/repos");
    } finally {
      globalThis.fetch = orig;
    }
    expect(seen[0].method).toBe("GET");
    expect((seen[0].headers as Record<string, string>).Authorization).toBe("Bearer ghp_test");
  });
  it("401 → yetki, 403 sınır → limit, ağ hatası → ag", async () => {
    const orig = globalThis.fetch;
    const run = async (res: () => Response | Promise<Response>) => {
      globalThis.fetch = (async () => res()) as typeof fetch;
      try {
        return await realGhFetch("t")("/x").then(() => null, (e: GithubError) => e.code);
      } finally {
        globalThis.fetch = orig;
      }
    };
    expect(await run(() => new Response("", { status: 401 }))).toBe("yetki");
    expect(await run(() => new Response("", { status: 403, headers: { "x-ratelimit-remaining": "0" } }))).toBe("limit");
    expect(await run(() => new Response("", { status: 403 }))).toBe("yetki");
    expect(await run(() => Promise.reject(new Error("offline")))).toBe("ag");
  });
});

describe("önbellek ve eski durum (Turso)", () => {
  let dir: string;
  let db: Client;
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "mertos-gh-"));
    db = createClient({ url: `file:${join(dir, "g.db")}` });
    await prepareDatabase(db);
  });
  afterAll(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("depo listesi → seçim → okuma; 15 dk içinde GitHub'a tekrar gidilmez", async () => {
    const calls: string[] = [];
    const gh = fakeGh({ ...repoRoutes(), "/user/repos": [{ full_name: "m/gizli", private: true, pushed_at: "2026-10-26T09:00:00Z" }, { full_name: "m/eski", archived: true }, { full_name: "m/diger", private: false }] }, calls);
    await refreshRepoList(db, gh, new Date("2026-10-26T12:00:00Z"));
    expect((await getRepoList(db)).repos.map((r) => [r.id, r.private, r.tracked])).toEqual([["m/gizli", true, false], ["m/diger", false, false]]);
    expect(await refreshTracked(db, gh, { now: new Date("2026-10-26T12:00:00Z") })).toEqual({ fetched: [], errors: [] }); // seçili yok

    await setTracked(db, "m/gizli", true);
    const t0 = new Date("2026-10-26T12:00:00Z");
    expect((await refreshTracked(db, gh, { now: t0 })).fetched).toEqual(["m/gizli"]);
    const n = calls.length;
    expect((await refreshTracked(db, gh, { now: new Date(t0.getTime() + 10 * 60_000) })).fetched).toEqual([]); // 10 dk: önbellek
    expect(calls.length).toBe(n);
    expect((await refreshTracked(db, gh, { now: new Date(t0.getTime() + 16 * 60_000) })).fetched).toEqual(["m/gizli"]); // 16 dk: tazelenir
    expect((await refreshTracked(db, gh, { force: true, now: new Date(t0.getTime() + 16 * 60_000 + 10_000) })).fetched).toEqual([]); // zorla: 60 sn kuralı
  });

  it("GitHub'a ulaşılamazsa son kaydedilen durum kalır, 'eski' işaretlenir", async () => {
    const down: GhFetch = async () => {
      throw new GithubError("GitHub'a ulaşılamadı.", "ag");
    };
    const t1 = new Date("2026-10-26T14:00:00Z");
    const r = await refreshTracked(db, down, { force: true, now: t1 });
    expect(r.errors).toEqual([{ id: "m/gizli", message: "GitHub'a ulaşılamadı.", code: "ag" }]);
    const [p] = await getProjectViews(db, t1);
    expect(p.github?.tasks).toHaveLength(3); // eski veri duruyor
    expect(p.github?.lastError?.message).toBe("GitHub'a ulaşılamadı.");
    expect(p.stale).toBe(true);
  });

  it("yerel (Mac) veri ayrı etiketli ve eski tarihiyle durur; modele yalnızca başlık/durum/sayı gider", async () => {
    await db.execute({
      sql: `INSERT INTO project_state (project_id, source, data, fetched_at) VALUES ('m/gizli', 'yerel', ?, '2026-10-20T08:00:00.000Z')`,
      args: [JSON.stringify({ repo: "m/gizli", tasks: [], stateHeadings: ["Durum"], dirtyCount: 4, branch: "feat-x", fetchedAt: "2026-10-20T08:00:00.000Z" })],
    });
    const [p] = await getProjectViews(db, new Date("2026-10-27T00:00:00Z"));
    expect(p.local?.fetchedAt).toBe("2026-10-20T08:00:00.000Z");
    const text = describeProjectsForModel([p]);
    expect(text).toContain("GitHub'daki son duruma göre");
    expect(text).toContain("güncelleme 26 Ekim");
    expect(text).toContain("ESKİ — GitHub'a ulaşılamadı");
    expect(text).toContain("açık: KVKK metni [bekliyor]; Bildirimler [devam]");
    expect(text).toContain("dalda: feat-bildirim (PR: Bildirimler) — test bekliyor");
    expect(text).toContain("yerel Mac özeti (20 Ekim, elle güncellenir): 4 kaydedilmemiş değişiklik — GitHub'da yok, durumunu bilmiyorum");
    // gizlilik: commit mesajı, PROJECT_STATE içeriği/başlığı modele gitmez
    expect(text).not.toContain("Giriş eklendi");
    expect(text).not.toContain("gizli içerik");
    expect(text).not.toContain("Durum\n");
  });
});
