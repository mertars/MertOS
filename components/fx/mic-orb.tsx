"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useEffectLevel } from "./effect-level";

// Mikrofon (Faz 3): boştayken cam disk içinde parlak çekirdek + mikrofon simgesi;
// konuşulunca çekirdeğin çevresinde sese göre uzayıp kısalan ışınlar, sesle
// şekil değiştiren dalga ve dışa yayılan halkalar. Konuşma bitince her şey
// yumuşakça geri çekilir. Ses kaynağı: gerçek mikrofon (AnalyserNode) ya da
// önizleme için yapay sinyal ("demo"). Efekt seviyesi: Düşük → yalnızca ışınlar
// (düşük kare hızı); Kapalı → animasyon yok, yalnızca durum rengi.

const BARS = 64;

export type MicSource = AnalyserNode | "demo" | null;

function readAnalyser(an: AnalyserNode, buf: Uint8Array<ArrayBuffer>, out: Float32Array): number {
  an.getByteFrequencyData(buf);
  // konuşma bandına odaklan: ilk ~%45'lik dilimi 64 ışına yay
  const usable = Math.floor(buf.length * 0.45);
  let sum = 0;
  for (let i = 0; i < BARS; i++) {
    const v = buf[Math.floor((i / BARS) * usable)] / 255;
    out[i] = v;
    sum += v;
  }
  return Math.min(1, (sum / BARS) * 1.8);
}

function demoFrame(t: number, out: Float32Array): number {
  // hece benzeri zarf: konuşma gibi inip çıkan enerji
  const env = Math.max(0, Math.sin(t * 5.1) * 0.5 + Math.sin(t * 2.3 + 1) * 0.35 + 0.35);
  for (let i = 0; i < BARS; i++) {
    const a = (i / BARS) * Math.PI * 2;
    out[i] = Math.max(0, env * (0.45 + 0.35 * Math.sin(a * 3 + t * 4) + 0.25 * Math.sin(a * 7 - t * 6.5)));
  }
  return Math.min(1, env * 0.95);
}

export function MicOrb({
  size = 112,
  active,
  source,
  onClick,
  className,
  label = "Mikrofon",
}: {
  size?: number;
  active: boolean;
  source?: MicSource;
  onClick?: () => void;
  className?: string;
  label?: string;
}) {
  const level = useEffectLevel();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const sourceRef = useRef<MicSource>(source ?? null);
  useEffect(() => {
    activeRef.current = active;
    sourceRef.current = source ?? null;
  }, [active, source]);

  useEffect(() => {
    if (level === "kapali") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const span = size * 2.3;
    const dpr = Math.min(window.devicePixelRatio || 1, level === "tam" ? 2 : 1.25);
    canvas.width = Math.round(span * dpr);
    canvas.height = Math.round(span * dpr);
    const fps = level === "tam" ? 60 : level === "orta" ? 40 : 20;
    const bins = new Float32Array(BARS);
    const smooth = new Float32Array(BARS);
    let buf: Uint8Array<ArrayBuffer> | null = null;
    let energy = 0;
    let raf = 0;
    let last = 0;
    let t = 0;
    const waves: { born: number; strength: number }[] = [];
    let lastWave = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (last && now - last < 1000 / fps - 1) return;
      const dt = last ? Math.min(now - last, 100) / 1000 : 0;
      last = now;
      t += dt;

      const src = sourceRef.current;
      let target = 0;
      if (activeRef.current && src === "demo") target = demoFrame(t, bins);
      else if (activeRef.current && src && typeof src !== "string") {
        if (!buf || buf.length !== src.frequencyBinCount) buf = new Uint8Array(src.frequencyBinCount);
        target = readAnalyser(src, buf, bins);
      } else bins.fill(0);
      // yükselişte hızlı, inişte yavaş — doğal his; bitince yumuşakça geri döner
      energy += (target - energy) * (target > energy ? 0.35 : 0.08);
      for (let i = 0; i < BARS; i++) smooth[i] += (bins[i] - smooth[i]) * (bins[i] > smooth[i] ? 0.4 : 0.1);

      const c = span / 2;
      const core = size * 0.36;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, span, span);

      if (level !== "dusuk") {
        // dışa yayılan halkalar
        if (activeRef.current && energy > 0.25 && t - lastWave > 0.55) {
          waves.push({ born: t, strength: energy });
          lastWave = t;
        }
        for (let i = waves.length - 1; i >= 0; i--) {
          const age = (t - waves[i].born) / 1.8;
          if (age >= 1) {
            waves.splice(i, 1);
            continue;
          }
          ctx.strokeStyle = `rgba(255,120,95,${(1 - age) * 0.35 * waves[i].strength})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(c, c, core * 1.25 + age * size * 0.75, 0, Math.PI * 2);
          ctx.stroke();
        }
        // sesle şekil değiştiren dalga (blob)
        if (energy > 0.01) {
          const grad = ctx.createRadialGradient(c, c, core * 0.6, c, c, core * 2.1);
          grad.addColorStop(0, `rgba(255,91,69,${0.5 * energy})`);
          grad.addColorStop(0.6, `rgba(140,82,255,${0.28 * energy})`);
          grad.addColorStop(1, "rgba(140,82,255,0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          for (let i = 0; i <= 96; i++) {
            const a = (i / 96) * Math.PI * 2;
            const k = smooth[Math.floor((i / 96) * BARS) % BARS];
            const r = core * (1.25 + energy * 0.35 + k * 0.35 * Math.sin(a * 3 + t * 2.2) + 0.08 * Math.sin(a * 5 - t * 3));
            const x = c + Math.cos(a) * r;
            const y = c + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
        }
      }

      // frekans ışınları — mercan → sarı → mor çevresinde döner
      ctx.lineCap = "round";
      const inner = core * 1.18;
      for (let i = 0; i < BARS; i++) {
        const v = smooth[i];
        if (v < 0.015) continue;
        const a = (i / BARS) * Math.PI * 2 - Math.PI / 2 + t * 0.15;
        const len = size * 0.06 + v * size * 0.42;
        const hue = i / BARS;
        ctx.strokeStyle = hue < 0.33 ? "#ff5b45" : hue < 0.66 ? "#ffc531" : "#8c52ff";
        ctx.globalAlpha = 0.35 + v * 0.65;
        ctx.lineWidth = Math.max(1.5, size * 0.022);
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(a) * inner, c + Math.sin(a) * inner);
        ctx.lineTo(c + Math.cos(a) * (inner + len), c + Math.sin(a) * (inner + len));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (coreRef.current) coreRef.current.style.transform = `scale(${1 + energy * 0.14})`;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [level, size]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn("relative grid place-items-center rounded-full outline-none", className)}
      style={{ width: size, height: size }}
    >
      {level !== "kapali" && (
        <canvas
          ref={canvasRef}
          aria-hidden
          className="pointer-events-none absolute"
          style={{ width: size * 2.3, height: size * 2.3, left: -size * 0.65, top: -size * 0.65 }}
        />
      )}
      {/* cam disk */}
      <span
        className={cn(
          "fx-glass absolute inset-0 rounded-full",
          level === "tam" && !active && "fx-mic-idle",
          active && level === "kapali" && "ring-2 ring-[var(--fx-asistan)]",
        )}
        style={{ ["--accent" as string]: "var(--fx-asistan)" }}
      />
      {/* parlak çekirdek */}
      <span
        ref={coreRef}
        className="relative grid place-items-center rounded-full transition-transform duration-300 ease-out"
        style={{
          width: size * 0.62,
          height: size * 0.62,
          background: "radial-gradient(circle at 34% 28%, #ffd7cf 0%, #ff8a73 16%, #ff5b45 46%, #b5261a 82%, #6e130b 100%)",
          boxShadow: "inset 0 -6px 14px rgba(80,10,0,0.55), inset 0 2px 3px rgba(255,255,255,0.5), 0 10px 26px -10px rgba(255,91,69,0.7)",
        }}
      >
        <MicGlyph size={size * 0.27} />
      </span>
    </button>
  );
}

function MicGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="8.25" y="2.5" width="7.5" height="12.5" rx="3.75" fill="white" />
      <path d="M5 11.5a7 7 0 0 0 14 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18.5V21.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
