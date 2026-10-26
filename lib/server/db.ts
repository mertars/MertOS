import "server-only";
import { createClient, type Client } from "@libsql/client";
import { prepareDatabase, type PrepareResult } from "./db-core";

// Turso bağlantısı — anahtarlar yalnızca sunucuda (Vercel ortam değişkeni).
// TURSO_DATABASE_URL: libsql://<veritabani>.turso.io
// TURSO_AUTH_TOKEN:   Turso panelinden alınan erişim anahtarı

export class DbNotConfiguredError extends Error {
  constructor() {
    super("Veritabanı yapılandırılmamış (TURSO_DATABASE_URL eksik).");
  }
}

let client: Client | null = null;
let prepared: Promise<PrepareResult> | null = null;

function getClient(): Client {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new DbNotConfiguredError();
  // Canlı sitede yerel SQLite dosyası kullanılmaz (görev dosyası § 3).
  if (process.env.VERCEL && url.startsWith("file:")) {
    throw new Error("Canlı ortamda yerel SQLite dosyası kullanılamaz — TURSO_DATABASE_URL bir libsql:// adresi olmalı.");
  }
  client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  return client;
}

/** Hazırlanmış (migration'ları uygulanmış) veritabanı istemcisi. Soğuk başlangıçta bir kez hazırlar. */
export async function getDb(): Promise<Client> {
  const c = getClient();
  if (!prepared) {
    prepared = prepareDatabase(c).catch((e) => {
      prepared = null;
      throw e;
    });
  }
  await prepared;
  return c;
}

export async function getDbInfo(): Promise<PrepareResult> {
  await getDb();
  return prepared!;
}
