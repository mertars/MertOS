/// <reference lib="webworker" />
// MertOS Service Worker — Serwist tabanlı, tamamen offline çalışma için.
// Bkz. CLAUDE.md § PWA / Offline.

import { defaultCache } from "@serwist/next/worker";
import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// --- Web Push: bkz. CLAUDE.md § Bildirimler / lib/notifications ---
interface MertosPushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

self.addEventListener("push", (event: PushEvent) => {
  let payload: MertosPushPayload = { title: "MertOS", body: "" };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    payload = { title: "MertOS", body: event.data?.text() ?? "" };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag,
      data: { url: payload.url ?? "/bugun" },
    }),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? "/bugun";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
