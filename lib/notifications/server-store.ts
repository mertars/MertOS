import "server-only";
import { Redis } from "@upstash/redis";
import type { NotificationServerRecord, NotificationSummary, SentLog } from "./types";

// Bu dosya SADECE sunucu route'larından import edilmeli (web-push/Redis
// bağımlılıkları client bundle'ına asla girmemeli).

const RECORD_KEY = "mertos:notifications";
const SUMMARY_KEY = "mertos:summary";
const SENT_LOG_KEY_PREFIX = "mertos:sent:"; // + yyyy-MM-dd

let redis: Redis | null = null;

export function isRedisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function getRedis(): Redis {
  if (!isRedisConfigured()) {
    throw new Error("Upstash Redis yapılandırılmamış (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN eksik).");
  }
  if (!redis) redis = Redis.fromEnv();
  return redis;
}

export async function getNotificationRecord(): Promise<NotificationServerRecord | null> {
  return getRedis().get<NotificationServerRecord>(RECORD_KEY);
}

export async function saveNotificationRecord(record: NotificationServerRecord): Promise<void> {
  await getRedis().set(RECORD_KEY, record);
}

export async function getSummary(): Promise<NotificationSummary | null> {
  return getRedis().get<NotificationSummary>(SUMMARY_KEY);
}

export async function saveSummary(summary: NotificationSummary): Promise<void> {
  await getRedis().set(SUMMARY_KEY, summary, { ex: 60 * 60 * 24 * 3 }); // 3 gün sonra kendiliğinden düşer
}

function todayKey(date: Date) {
  return `${SENT_LOG_KEY_PREFIX}${date.toISOString().slice(0, 10)}`;
}

export async function getSentLogToday(date: Date = new Date()): Promise<SentLog> {
  return (await getRedis().get<SentLog>(todayKey(date))) ?? {};
}

export async function appendSentLog(category: string, atHHMM: string, date: Date = new Date()): Promise<void> {
  const key = todayKey(date);
  const log = await getSentLogToday(date);
  log[category] = [...(log[category] ?? []), atHHMM];
  await getRedis().set(key, log, { ex: 60 * 60 * 30 }); // ~30 saat sonra otomatik temizlenir
}

export async function clearSubscription(): Promise<void> {
  await getRedis().del(RECORD_KEY);
}
