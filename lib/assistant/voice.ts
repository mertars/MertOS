"use client";

import { useSyncExternalStore } from "react";
import type { VoiceChoice } from "./config";

// Sesli okuma (Faz 4). İki seçenek: tarayıcının hazır sesi (speechSynthesis,
// tr-TR) ya da Gemini sesi (/api/assistant/tts → WAV). Gemini sesi herhangi bir
// sebeple alınamazsa (kota, ağ, hata) otomatik tarayıcı sesine döner; o da
// yoksa sessiz kalınır (metin zaten ekranda). Tarayıcılar dokunuşsuz sesi
// engellediği için `unlock()` bir dokunuşun içinde çağrılmalı ("Başlat").

type State = { unlocked: boolean; speaking: boolean; analyser: AnalyserNode | null };
let state: State = { unlocked: false, speaking: false, analyser: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

let ctx: AudioContext | null = null;
let current: AudioBufferSourceNode | null = null;
let token = 0;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Bir dokunuşun içinde çağrılır: ses bağlamını ve konuşma sentezini açar. */
export function unlockVoice() {
  const ac = audioContext();
  if (ac) {
    void ac.resume().catch(() => null);
    // iOS: dokunuş içinde kısa sessiz bir tampon çalmak kilidi açar
    const src = ac.createBufferSource();
    src.buffer = ac.createBuffer(1, 1, 22050);
    src.connect(ac.destination);
    src.start(0);
  }
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }
  set({ unlocked: true });
}

export function isVoiceUnlocked() {
  return state.unlocked;
}

/** Markdown ve listeyi sesli okumaya uygun düz metne çevirir. */
export function speakableText(text: string): string {
  return text
    .replace(/\[\[[^\]]*\]\]/g, "")
    .replace(/^\s*([-*•]|\d+[.)])\s+/gm, "")
    .replace(/[*_#`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stopSpeaking() {
  token++;
  try {
    current?.stop();
  } catch {
    // zaten durmuş
  }
  current = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  set({ speaking: false, analyser: null });
}

function turkishVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang?.toLowerCase().startsWith("tr")) ?? null;
}

/** Chrome ses listesini geç yükler: ilk çağrıda boş gelebilir, kısa süre beklenir. */
function voicesReady(): Promise<void> {
  const synth = window.speechSynthesis;
  if (synth.getVoices().length > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      resolve();
    };
    synth.addEventListener("voiceschanged", done);
    setTimeout(done, 1000);
  });
}

async function speakBrowser(text: string, my: number): Promise<boolean> {
  if (!("speechSynthesis" in window)) return false;
  await voicesReady();
  if (my !== token) return false;
  // Chrome: cancel() hemen ardından speak() çağrısı konuşmayı yutabiliyor; kısa bekle, duraklamışsa sürdür.
  await new Promise((r) => setTimeout(r, 80));
  window.speechSynthesis.resume();
  return new Promise<boolean>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "tr-TR";
    const v = turkishVoice();
    if (v) u.voice = v;
    u.rate = 1.02;
    // Bazı tarayıcılarda sentez hiç başlamaz ya da "bitti" olayı gelmez: kilitli kalmasın.
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(startTimer);
      clearTimeout(endTimer);
      if (my === token) set({ speaking: false });
      resolve(ok);
    };
    const startTimer = setTimeout(() => {
      window.speechSynthesis.cancel();
      finish(false);
    }, 4000);
    const endTimer = setTimeout(() => finish(true), 8000 + text.length * 90);
    u.onstart = () => {
      clearTimeout(startTimer);
      if (my === token) set({ speaking: true, analyser: null });
    };
    u.onend = () => finish(true);
    u.onerror = () => finish(false);
    window.speechSynthesis.speak(u);
  });
}

async function speakGemini(text: string, my: number): Promise<boolean> {
  const ac = audioContext();
  if (!ac) return false;
  let res: Response;
  try {
    res = await fetch("/api/assistant/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: text.slice(0, 600) }) });
  } catch {
    return false;
  }
  if (!res.ok || my !== token) return false;
  try {
    const buffer = await ac.decodeAudioData(await res.arrayBuffer());
    if (my !== token) return true;
    await ac.resume().catch(() => null);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const analyser = ac.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    analyser.connect(ac.destination);
    current = src;
    set({ speaking: true, analyser });
    await new Promise<void>((resolve) => {
      src.onended = () => resolve();
      src.start(0);
    });
    if (my === token) set({ speaking: false, analyser: null });
    return true;
  } catch {
    return false;
  }
}

/** Metni seçilen sesle okur. Dönen değer: hangi sesle okundu (ya da okunamadı). */
export async function speak(text: string, choice: VoiceChoice): Promise<"gemini" | "tarayici" | "yok"> {
  const clean = speakableText(text);
  if (!clean || typeof window === "undefined") return "yok";
  stopSpeaking();
  const my = ++token;
  if (choice === "gemini" && (await speakGemini(clean, my))) return "gemini";
  if (my !== token) return "yok";
  return (await speakBrowser(clean, my)) ? "tarayici" : "yok";
}

export function useVoiceState(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
