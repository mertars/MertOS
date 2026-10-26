"use client";

import { useEffect, useRef, useState } from "react";
import type { MicSource } from "@/components/fx/mic-orb";

// Mikrofonla dikte (Faz 3 köprüsü; sesli cevap ve proaktif konuşma Faz 4'te):
// tarayıcının konuşma tanıması (tr-TR) söyleneni yazıya döker; konuşma bitince
// metin `onFinal` ile gönderilir. Mikrofon küresinin sese tepki vermesi için
// ayrıca bir AnalyserNode açılır; açılamazsa (ör. iOS iki dinleyiciye izin
// vermezse) küre yapay sinyalle hareket eder.

interface RecognitionResultList {
  length: number;
  [i: number]: { isFinal: boolean; 0: { transcript: string } };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: RecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Mikrofon izni verilmedi.",
  "service-not-allowed": "Bu tarayıcıda konuşma tanıma kapalı.",
  "no-speech": "Ses duyulmadı.",
  network: "Konuşma tanıma için internet gerekli.",
};

export function useDictation(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [source, setSource] = useState<MicSource>(null);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const finalRef = useRef("");
  const cancelledRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const releaseAudio = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioRef.current?.close().catch(() => null);
    audioRef.current = null;
    setSource(null);
  };

  useEffect(
    () => () => {
      recRef.current?.abort();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioRef.current?.close().catch(() => null);
    },
    [],
  );

  async function start(): Promise<boolean> {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setError("Bu tarayıcı sesli yazmayı desteklemiyor (Safari ya da Chrome deneyin).");
      return false;
    }
    if (recRef.current) return true;
    setError(null);
    setInterim("");
    finalRef.current = "";
    cancelledRef.current = false;

    const rec = new Ctor();
    rec.lang = "tr-TR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim((finalRef.current + " " + interimText).trim());
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted") setError(ERRORS[e.error] ?? "Ses anlaşılamadı.");
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      releaseAudio();
      const text = finalRef.current.trim();
      setInterim("");
      if (text && !cancelledRef.current) onFinalRef.current(text);
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setError("Mikrofon başlatılamadı.");
      return false;
    }
    setListening(true);

    // Küre için ses seviyesi
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!recRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return true;
      }
      streamRef.current = stream;
      const ac = new AudioContext();
      audioRef.current = ac;
      const an = ac.createAnalyser();
      an.fftSize = 256;
      an.smoothingTimeConstant = 0.6;
      ac.createMediaStreamSource(stream).connect(an);
      setSource(an);
    } catch {
      setSource("demo");
    }
    return true;
  }

  /** Dinlemeyi bitirir; söylenen metin gönderilir. */
  function stop() {
    recRef.current?.stop();
  }

  /** Dinlemeyi iptal eder; hiçbir şey gönderilmez. */
  function cancel() {
    cancelledRef.current = true;
    recRef.current?.abort();
  }

  return { supported: recognitionCtor() !== null, listening, interim, source, error, start, stop, cancel };
}
