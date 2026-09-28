import { NextResponse } from "next/server";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { appendSentLog, clearSubscription, getNotificationRecord, getSentLogToday, getSummary, isRedisConfigured } from "@/lib/notifications/server-store";
import { isVapidConfigured, sendPush } from "@/lib/notifications/push-sender";
import { shouldFireNow } from "@/lib/notifications/scheduler";
import { interpolateTemplate, pickRandomTemplate } from "@/lib/notifications/templates";
import { ALL_CATEGORIES, CATEGORY_LABEL, type NotificationSummary } from "@/lib/notifications/types";

const TIMEZONE = "Europe/Istanbul";

function computeGoalMet(category: string, summary: NotificationSummary | null): boolean | null {
  if (!summary) return null;
  if (category === "su") return summary.su_kalan <= 0;
  if (category === "sigara") return summary.sigara_bugun <= summary.sigara_limit;
  return null;
}

/** cron-job.org (veya benzeri) tarafından her ~5 dakikada bir çağrılır. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }
  if (!isRedisConfigured() || !isVapidConfigured()) {
    return NextResponse.json({ error: "Bildirim sunucusu yapılandırılmamış." }, { status: 503 });
  }

  const record = await getNotificationRecord();
  if (!record) return NextResponse.json({ fired: [], reason: "abonelik yok" });

  const now = toZonedTime(new Date(), TIMEZONE);
  const nowHHMM = format(now, "HH:mm");
  const isSunday = now.getDay() === 0;

  const summary = await getSummary();
  const sentLog = await getSentLogToday(now);
  const fired: string[] = [];
  let expired = false;

  for (const category of ALL_CATEGORIES) {
    if (category === "haftalik_rapor" && !isSunday) continue;
    const settings = record.categories[category];
    if (!settings) continue;

    const decision = shouldFireNow({
      nowHHMM,
      quietHoursStart: record.quietHoursStart,
      quietHoursEnd: record.quietHoursEnd,
      settings,
      sentTimesToday: sentLog[category] ?? [],
      goalMet: computeGoalMet(category, summary),
    });
    if (!decision) continue;

    const template = pickRandomTemplate(settings.templates);
    const body = summary ? interpolateTemplate(template, summary) : template;

    const result = await sendPush(record.subscription, { title: `MertOS — ${CATEGORY_LABEL[category]}`, body, tag: category, url: "/bugun" });
    if (result.expired) {
      expired = true;
      break;
    }
    if (result.ok) {
      await appendSentLog(category, nowHHMM, now);
      fired.push(category);
    }
  }

  if (expired) await clearSubscription();

  return NextResponse.json({ fired, expired });
}
