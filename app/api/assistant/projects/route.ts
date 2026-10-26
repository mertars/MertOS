import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/server/db";
import { GithubError, isGithubConfigured, realGhFetch } from "@/lib/server/github";
import { errorResponse } from "@/lib/server/http";
import { getProjectViews, getRepoList, setTracked } from "@/lib/server/projects-store";
import { refreshRepoList, refreshTracked } from "@/lib/server/projects-repo";

// Projeler sekmesi: GitHub'dan YALNIZCA OKUR. Anahtar sunucuda (GITHUB_TOKEN), istemciye gitmez.
// GET: saklı durum; önbellek ~15 dk'dan eskiyse tazeler. ?yenile=1: elle tazeleme (60 sn'de bir);
// ?depolar=1: hesaptaki depo listesini yeniden okur. GitHub'a ulaşılamazsa son kaydedilen durum döner.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const configured = isGithubConfigured();
  try {
    const db = await getDb();
    let error: { message: string; code: string } | null = null;
    if (configured) {
      const gh = realGhFetch();
      try {
        const saved = await getRepoList(db);
        if (url.searchParams.get("depolar") === "1" || saved.repos.length === 0) await refreshRepoList(db, gh);
        const r = await refreshTracked(db, gh, { force: url.searchParams.get("yenile") === "1" });
        if (r.errors[0]) error = r.errors[0];
      } catch (e) {
        error = { message: e instanceof Error ? e.message : "GitHub'a ulaşılamadı.", code: e instanceof GithubError ? e.code : "hata" };
      }
    }
    const [projects, repos] = await Promise.all([getProjectViews(db), getRepoList(db)]);
    return NextResponse.json({ configured, error, projects, repos: repos.repos, reposFetchedAt: repos.fetchedAt, now: new Date().toISOString() });
  } catch (e) {
    return errorResponse(e);
  }
}

const patchSchema = z.object({ id: z.string().regex(/^[\w.-]+\/[\w.-]+$/), tracked: z.boolean() });

/** Depoyu izle / izlemeyi bırak (tek dokunuş). İzlemeye alınınca durumu hemen okunur. */
export async function PATCH(req: Request) {
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  try {
    const db = await getDb();
    if (!(await setTracked(db, parsed.data.id, parsed.data.tracked))) return NextResponse.json({ error: "Depo listede yok." }, { status: 404 });
    if (parsed.data.tracked && isGithubConfigured()) await refreshTracked(db, realGhFetch(), { force: true }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
