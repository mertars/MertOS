"use client";

import { useEffect, useRef } from "react";
import { Volume2 } from "lucide-react";
import { fetchBrief, readCachedBrief, requestProactive, storedConversationId, type ClientChatMessage } from "@/lib/assistant/client";
import { dueSlot } from "@/lib/assistant/proactive";
import { istanbulNow } from "@/lib/assistant/time";
import { useAssistantSettings } from "@/lib/assistant/use-settings";
import { isVoiceUnlocked, speak, unlockVoice, useVoiceState } from "@/lib/assistant/voice";
import { useToastStore } from "@/lib/store/toast-store";

// Planlı konuşma (Faz 4 § 2) — istemci tarafı. Uygulama AÇIK ve ön plandayken
// 30 sn'de bir son günlük özetteki program saatlerine bakılır; bir anın saati
// geldiyse sunucuya sorulur (asıl kararı sunucu verir, sohbete yazar). Mesaj
// açık sohbet ekranına eklenir ve sesli okunur; sohbet ekranı açık değilse
// kısa bir bildirim kartı (toast) çıkar. Uygulama kapalıyken konuşamaz —
// bildirim yok (Mert'in kararı). Tarayıcılar dokunuşsuz sesi engellediği için
// açılışta bir kez "Başlat" dokunuşu istenir (ya da ekrana herhangi bir dokunuş).

const TICK_MS = 30_000;
const BRIEF_REFRESH_MS = 10 * 60_000;
const SPOKEN_KEY = "mertos-proaktif";

const listeners = new Set<(m: ClientChatMessage) => void>();

/** Sohbet ekranı planlı konuşmaları buradan alır (açıkken toast çıkmaz). */
export function useProactiveMessages(receive: (m: ClientChatMessage) => void) {
  const ref = useRef(receive);
  useEffect(() => {
    ref.current = receive;
  });
  useEffect(() => {
    const l = (m: ClientChatMessage) => ref.current(m);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
}

function readSpoken(date: string): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SPOKEN_KEY) ?? "null") as { date: string; spoken: string[] } | null;
    return raw?.date === date ? raw.spoken : [];
  } catch {
    return [];
  }
}

function writeSpoken(date: string, spoken: string[]) {
  try {
    localStorage.setItem(SPOKEN_KEY, JSON.stringify({ date, spoken: [...new Set(spoken)] }));
  } catch {
    // önemli değil: sunucu zaten günde bir kez söyletiyor
  }
}

export function ProactiveRunner() {
  const settings = useAssistantSettings();
  const voice = useVoiceState();
  const push = useToastStore((s) => s.push);
  const live = useRef({ settings, speaking: voice.speaking, push });
  useEffect(() => {
    live.current = { settings, speaking: voice.speaking, push };
  });

  useEffect(() => {
    let busy = false;
    let lastBriefFetch = 0;

    async function tick() {
      const { settings, speaking, push } = live.current;
      if (!settings.proaktif || busy || speaking || document.visibilityState !== "visible" || !navigator.onLine) return;
      const now = istanbulNow();
      const brief = readCachedBrief()?.brief;
      if (!brief || brief.date !== now.date) {
        // Gün döndü ya da özet hiç çekilmedi: tazele, sonraki turda bakılır.
        if (Date.now() - lastBriefFetch > BRIEF_REFRESH_MS) {
          lastBriefFetch = Date.now();
          await fetchBrief().catch(() => null);
        }
        return;
      }
      const spoken = readSpoken(now.date);
      const slot = dueSlot(brief, now.time, spoken);
      if (!slot) return;

      busy = true;
      try {
        const r = await requestProactive(slot, storedConversationId());
        writeSpoken(now.date, [...spoken, slot, ...r.spoken]);
        if (!r.message) return;
        const message = r.message;
        listeners.forEach((l) => l(message));
        if (!listeners.size) push({ title: "Asistan", description: message.content });
        if (settings.sesliOkuma && isVoiceUnlocked()) await speak(message.content, settings.ses);
      } catch {
        // ağ/sunucu hatası: sonraki turda yeniden denenir (pencere 30 dk)
      } finally {
        busy = false;
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), TICK_MS);
    const onVisible = () => document.visibilityState === "visible" && void tick();
    document.addEventListener("visibilitychange", onVisible);
    // Ekrana ilk dokunuş sesi de açar (ayrıca "Başlat" kartı var).
    const onFirstTap = () => unlockVoice();
    document.addEventListener("click", onFirstTap, { once: true, capture: true });
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("click", onFirstTap, { capture: true });
    };
  }, []);

  return null;
}

/** Açılışta tek dokunuşluk ses izni — planlı konuşma + sesli okuma açıksa ve henüz dokunulmadıysa. */
export function StartVoiceBanner() {
  const settings = useAssistantSettings();
  const voice = useVoiceState();
  if (voice.unlocked || !settings.proaktif || !settings.sesliOkuma) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(max(env(safe-area-inset-bottom),12px)+80px)] z-30 flex justify-center px-4 lg:bottom-6">
      <button
        type="button"
        onClick={unlockVoice}
        className="fx-glass fx-enter pointer-events-auto flex items-center gap-2.5 py-2 pl-2 pr-4 text-left"
        style={{ ["--accent" as string]: "var(--fx-asistan)", ["--fx-radius" as string]: "999px", background: "rgba(10, 10, 12, 0.88)" }}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "color-mix(in srgb, var(--fx-asistan) 22%, transparent)" }}>
          <Volume2 className="h-4 w-4" style={{ color: "var(--fx-asistan)" }} />
        </span>
        <span className="leading-tight">
          <span className="block text-[13px] font-semibold">Sesi başlat</span>
          <span className="block text-[10.5px] text-[var(--fx-text-3)]">Planlı konuşmalar için bir kez dokunun</span>
        </span>
      </button>
    </div>
  );
}
