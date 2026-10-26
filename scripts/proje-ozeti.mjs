// Proje özeti: tasks.json + PROJECT_STATE.md ayrıştırıcıları (GitHub okuyucu ve Mac betiği ORTAK kullanır)
// ve Routinix Kampüs gibi projeler için ELLE çalışan Mac komutu (Faz 5 § 5).
//
// Kullanım (Mac'te, MertOS klasöründe):
//   node scripts/proje-ozeti.mjs ~/Projeler/routinix-kampus
//   node scripts/proje-ozeti.mjs ~/Projeler/routinix-kampus --dene     (yazmaz, yalnızca ne yazacağını gösterir)
//   node scripts/proje-ozeti.mjs ~/Projeler/routinix-kampus --depo mertars/routinix-kampus
//
// Yalnızca ÖZET yazar: görev başlıkları + durumları, PROJECT_STATE.md başlıkları, kaydedilmemiş
// değişiklik SAYISI. Dosya içeriği, kod, değişen dosya adları ASLA gönderilmez. Kendiliğinden
// çalışmaz; arka planda çalıştırma yok. Veritabanı anahtarı projede değil ~/.config/mertos/env dosyasında.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseHeadings, parseTasks, repoFromRemote } from "./proje-ayristir.mjs";

export { parseHeadings, parseTasks, repoFromRemote };

function loadEnvFile() {
  const file = join(homedir(), ".config", "mertos", "env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function git(cwd, ...args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

/** Klasörden özet (kaydedilmemiş değişiklikler yalnızca SAYI). */
export function summarizeFolder(dir, repoArg) {
  const readIf = (name) => (existsSync(join(dir, name)) ? readFileSync(join(dir, name), "utf8") : null);
  const tasksText = readIf("tasks.json");
  const stateText = readIf("PROJECT_STATE.md");
  const status = git(dir, "status", "--short");
  const remote = git(dir, "remote", "get-url", "origin");
  return {
    repo: repoArg ?? (remote ? repoFromRemote(remote) : null),
    tasks: tasksText === null ? null : parseTasks(tasksText),
    stateHeadings: stateText === null ? null : parseHeadings(stateText),
    dirtyCount: status === null ? null : status.split("\n").filter(Boolean).length,
    branch: git(dir, "branch", "--show-current") || null,
    fetchedAt: new Date().toISOString(),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dene");
  const depoAt = args.indexOf("--depo");
  const repoArg = depoAt >= 0 ? args[depoAt + 1] : undefined;
  const pathArg = args.find((a, i) => !a.startsWith("--") && (depoAt < 0 || i !== depoAt + 1));
  const dir = resolve((pathArg ?? ".").replace(/^~/, homedir()));
  if (!existsSync(dir)) throw new Error(`Klasör yok: ${dir}`);

  const data = summarizeFolder(dir, repoArg);
  if (!data.repo) throw new Error("GitHub deposu anlaşılamadı: klasörde 'origin' yok. --depo kullanici/depo ile verin.");
  const open = data.tasks?.filter((t) => t.status !== "bitti").length;
  console.log(`Depo: ${data.repo} · dal: ${data.branch ?? "?"}`);
  console.log(`Görevler: ${data.tasks === null ? "tasks.json yok / okunamadı" : `${data.tasks.length} (açık ${open})`}`);
  console.log(`PROJECT_STATE.md başlıkları: ${data.stateHeadings === null ? "dosya yok" : data.stateHeadings.length}`);
  console.log(`Kaydedilmemiş değişiklik: ${data.dirtyCount === null ? "git okunamadı" : data.dirtyCount}`);
  if (dry) {
    console.log("\n--dene: veritabanına YAZILMADI. Yazılacak veri:\n" + JSON.stringify(data, null, 2));
    return;
  }

  loadEnvFile();
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL yok. ~/.config/mertos/env dosyasına TURSO_DATABASE_URL ve TURSO_AUTH_TOKEN satırlarını koyun.");
  const { createClient } = await import("@libsql/client");
  const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  const now = new Date().toISOString();
  await db.batch(
    [
      { sql: `INSERT OR IGNORE INTO projects (id, name, source, tracked, added_at) VALUES (?, ?, 'github', 1, ?)`, args: [data.repo, data.repo, now] },
      {
        sql: `INSERT INTO project_state (project_id, source, data, fetched_at) VALUES (?, 'yerel', ?, ?)
              ON CONFLICT(project_id, source) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`,
        args: [data.repo, JSON.stringify(data), now],
      },
    ],
    "write",
  );
  db.close();
  console.log("\nTamam — yerel özet yazıldı. Projeler sekmesinde 'yerel' etiketiyle görünür.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e) => {
    console.error("Hata:", e.message);
    process.exit(1);
  });
}
