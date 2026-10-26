// Proje özeti ayrıştırıcıları — SAF (Node modülü yok): tarayıcı paketine de girebilir.
// GitHub okuyucu (lib/server/github.ts) ve Mac betiği (scripts/proje-ozeti.mjs) ORTAK kullanır.

const TITLE_MAX = 100;
const DONE = new Set(["done", "completed", "complete", "closed", "finished", "merged", "bitti", "tamam", "tamamlandi", "tamamlandı", "yapildi", "yapıldı"]);
const DOING = new Set(["in_progress", "in-progress", "in progress", "doing", "started", "active", "wip", "devam", "devam ediyor", "testing", "review", "in_review", "testte"]);
const DROPPED = new Set(["cancelled", "canceled", "dropped", "wontfix", "iptal", "vazgecildi", "vazgeçildi"]);

/** tasks.json içeriğinden [{title, status}] — status: bitti | devam | bekliyor. Biçim bilinmediği için toleranslı; bozuksa null. */
export function parseTasks(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  let list = Array.isArray(data) ? data : null;
  if (!list && data && typeof data === "object") {
    list = ["tasks", "items", "todos", "gorevler"].map((k) => data[k]).find(Array.isArray) ?? Object.values(data).find((v) => Array.isArray(v) && v.some((x) => x && typeof x === "object")) ?? null;
  }
  if (!list) return null;
  const out = [];
  for (const item of list) {
    if (typeof item === "string") {
      out.push({ title: item.trim().slice(0, TITLE_MAX), status: "bekliyor" });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const title = [item.title, item.name, item.task, item.summary, item.text, item.id].find((v) => typeof v === "string" && v.trim());
    if (!title) continue;
    const raw = String(item.status ?? item.state ?? "").trim().toLowerCase();
    if (DROPPED.has(raw)) continue;
    let status = "bekliyor";
    if (DONE.has(raw) || item.done === true || item.completed === true) status = "bitti";
    else if (DOING.has(raw)) status = "devam";
    out.push({ title: title.trim().slice(0, TITLE_MAX), status });
  }
  return out;
}

/** PROJECT_STATE.md başlıkları (içerik DEĞİL): en fazla 10, 80 karakter. */
export function parseHeadings(text) {
  return [...text.matchAll(/^#{1,3}[ \t]+(.+?)[ \t]*#*[ \t]*$/gm)].map((m) => m[1].trim().slice(0, 80)).filter(Boolean).slice(0, 10);
}

/** "git@github.com:mertars/routinix.git" / "https://github.com/mertars/routinix" → "mertars/routinix" */
export function repoFromRemote(url) {
  const m = url.trim().match(/github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

