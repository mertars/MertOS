import "server-only";
import webpush from "web-push";

export function isVapidConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

let configured = false;
function ensureConfigured() {
  if (configured) return;
  if (!isVapidConfigured()) throw new Error("VAPID anahtarları yapılandırılmamış.");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

/** Bildirimi gönderir. Abonelik artık geçersizse (410/404) `expired: true` döner. */
export async function sendPush(subscription: PushSubscriptionJSON, payload: PushPayload): Promise<{ ok: boolean; expired?: boolean }> {
  ensureConfigured();
  try {
    await webpush.sendNotification(subscription as webpush.PushSubscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) return { ok: false, expired: true };
    throw err;
  }
}
