"use client";

import type { NotificationCategorySettings } from "@/lib/db/types";
import { ALL_CATEGORIES } from "./types";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export interface SubscribeResult {
  ok: boolean;
  error?: string;
}

export async function subscribeToPush(
  quietHoursStart: string,
  quietHoursEnd: string,
  categories: Record<string, NotificationCategorySettings>,
): Promise<SubscribeResult> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, error: "Bu tarayıcı push bildirimlerini desteklemiyor." };
  }
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return { ok: false, error: "VAPID anahtarı yapılandırılmamış (README'ye bak)." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Bildirim izni verilmedi." };

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
    });
  }

  const missing = ALL_CATEGORIES.filter((c) => !(c in categories));
  if (missing.length > 0) return { ok: false, error: "Eksik kategori ayarı." };

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON(), quietHoursStart, quietHoursEnd, categories }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, error: err.error ?? "Sunucu hatası." };
  }
  return { ok: true };
}

export async function unsubscribeFromPush(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) await subscription.unsubscribe();
  await fetch("/api/push/unsubscribe", { method: "POST" }).catch(() => undefined);
}

export async function getPushPermissionState(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function hasActivePushSubscription(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription != null;
}
