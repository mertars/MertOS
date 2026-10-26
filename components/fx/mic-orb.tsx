"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useEffectLevel } from "./effect-level";

// Mikrofon (Faz 3, Mert'in geri bildirimiyle 2. sürüm): koyu cilalı cam küre +
// ince çizgili mikrofon simgesi. Boşta: çevresinde çok ince bir çember ve yavaşça
// dönen soluk bir ışık yayı. Konuşulunca: üç ince ışık çemberi sesin frekans
// bantlarına göre akışkan biçimde dalgalanır, kürenin içinde sesle birlikte sıcak
// bir parıltı yanar. Konuşma bitince çemberler yumuşakça düz daireye döner.
// Ses kaynağı: gerçek mikrofon (AnalyserNode) ya da önizleme için yapay sinyal.
// Efekt seviyesi: Düşük → tek çember, düşük kare hızı; Kapalı → animasyon yok.

const BANDS = 8;

export type MicSource = AnalyserNode | "demo" | null;

/** Analyser'dan konuşma bandına yayılmış 8 bant (0..1) + genel enerji */
function readAnalyser(an: AnalyserNode, buf: Uint8Array<ArrayBuffer>, out: Float32Array): number {
  an.getByteFrequencyData(buf);
  const usable = Math.floor(buf.length * 0.5);
  const per = Math.max(1, Math.floor(usable / BANDS));
  let total = 0;
  for (let b = 0; b < BANDS; b++) {
    let s = 0;
    for (let i = 0; i < per; i++) s += buf[b * per + i];
    out[b] = s / per / 255;
    total += out[b];
  }
  return Math.min(1, (total / BANDS) * 1.9);
}

function demoFrame(t: number, out: Float32Array): number {
  const env = Math.max(0, Math.sin(t * 4.3) * 0.45 + Math.sin(t * 1.9 + 1) * 0.35 + 0.35);
  for (let b = 0; b < BANDS; b++) out[b] = Math.max(0, env * (0.5 + 0.5 * Math.sin(t * (2 + b * 0.7) + b)));
  return Math.min(1, env * 0.95);
}

const RINGS = [
  { color: "255,255,255", alpha: 0.85, width: 1.4, phase: 0, gain: 1 },
  { color: "255,140,115", alpha: 0.5, width: 1.1, phase: 2.1, gain: 1.25 },
  { color: "170,140,255", alpha: 0.45, width: 1.1, phase: 4.2, gain: 1.45 },
];

export function MicOrb({
  size = 112,
  active,
  source,
  onClick,
  className,
  label = "Mikrofon",
  href,
}: {
  size?: number;
  active: boolean;
  source?: MicSource;
  onClick?: () => void;
  className?: string;
  label?: string;
  /** Verilirse düğme yerine bağlantı (ör. Bugün ekranındaki kısayol → /asistan) */
  href?: string;
}) {
  const level = useEffectLevel();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
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
    const span = size * 1.9;
    const dpr = Math.min(window.devicePixelRatio || 1, level === "tam" ? 2 : 1.25);
    canvas.width = Math.round(span * dpr);
    canvas.height = Math.round(span * dpr);
    const fps = level === "tam" ? 60 : level === "orta" ? 40 : 20;
    const rings = level === "dusuk" ? RINGS.slice(0, 1) : RINGS;
    const bands = new Float32Array(BANDS);
    const smooth = new Float32Array(BANDS);
    let buf: Uint8Array<ArrayBuffer> | null = null;
    let energy = 0;
    let raf = 0;
    let last = 0;
    let t = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (last && now - last < 1000 / fps - 1) return;
      const dt = last ? Math.min(now - last, 100) / 1000 : 0;
      last = now;
      t += dt;

      const src = sourceRef.current;
      let target = 0;
      if (activeRef.current && src === "demo") target = demoFrame(t, bands);
      else if (activeRef.current && src && typeof src !== "string") {
        if (!buf || buf.length !== src.frequencyBinCount) buf = new Uint8Array(src.frequencyBinCount);
        target = readAnalyser(src, buf, bands);
      } else bands.fill(0);
      // ağır yumuşatma: titreşim değil, akış
      energy += (target - energy) * (target > energy ? 0.18 : 0.06);
      for (let b = 0; b < BANDS; b++) smooth[b] += (bands[b] - smooth[b]) * 0.12;

      const c = span / 2;
      const base = size * 0.5 + 6;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, span, span);

      if (energy < 0.02 && !activeRef.current) {
        // boşta: ince çember + yavaş dönen soluk ışık yayı (yalnız Tam)
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(c, c, base, 0, Math.PI * 2);
        ctx.stroke();
        if (level === "tam" && "createConicGradient" in ctx) {
          const a0 = t * 0.5;
          const g = ctx.createConicGradient(a0, c, c);
          g.addColorStop(0, "rgba(255,255,255,0.55)");
          g.addColorStop(0.12, "rgba(255,255,255,0)");
          g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(c, c, base, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        ctx.globalCompositeOperation = "lighter";
        for (const ring of rings) {
          ctx.beginPath();
          const pts = 120;
          for (let i = 0; i <= pts; i++) {
            const a = (i / pts) * Math.PI * 2;
            // bantlardan yumuşak bir yarıçap profili: 2–4 loblu, yavaş dönen
            let k = 0;
            for (let b = 0; b < 4; b++) k += smooth[b * 2] * Math.sin(a * (b + 2) + t * (0.8 + b * 0.35) + ring.phase);
            const r = base + energy * size * 0.05 * ring.gain + k * size * 0.035 * ring.gain;
            const x = c + Math.cos(a) * r;
            const y = c + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(${ring.color},${ring.alpha * (0.35 + energy * 0.65)})`;
          ctx.lineWidth = ring.width;
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
      }
      if (glowRef.current) glowRef.current.style.opacity = String(Math.min(1, energy * 1.2));
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [level, size]);

  const cls = cn("group relative grid place-items-center rounded-full outline-none transition-transform duration-300 active:scale-[0.96]", className);
  const body = (
    <>
      {level !== "kapali" && (
        <canvas
          ref={canvasRef}
          aria-hidden
          className="pointer-events-none absolute"
          style={{ width: size * 1.9, height: size * 1.9, left: -size * 0.45, top: -size * 0.45 }}
        />
      )}
      {/* koyu cilalı cam küre */}
      <span
        className={cn("absolute inset-0 overflow-hidden rounded-full", active && level === "kapali" && "ring-1 ring-white/60")}
        style={{
          background: "radial-gradient(120% 120% at 50% 0%, #2a2a2e 0%, #121214 38%, #050506 75%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.28), inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 -10px 24px rgba(0,0,0,0.7), 0 18px 40px -16px rgba(0,0,0,0.9)",
        }}
      >
        {/* üst yansıma */}
        <span
          className="absolute left-[18%] right-[18%] top-[6%] h-[36%] rounded-[50%]"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0))" }}
        />
        {/* sesle yanan sıcak iç parıltı */}
        <span
          ref={glowRef}
          className="absolute inset-0 rounded-full opacity-0"
          style={{ background: "radial-gradient(60% 60% at 50% 62%, rgba(255,120,92,0.45), rgba(170,120,255,0.18) 55%, transparent 75%)" }}
        />
      </span>
      <MicGlyph size={size * 0.3} />
    </>
  );
  if (href)
    return (
      <Link href={href} aria-label={label} className={cls} style={{ width: size, height: size }}>
        {body}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={active} className={cls} style={{ width: size, height: size }}>
      {body}
    </button>
  );
}

/** İnce çizgili mikrofon simgesi */
function MicGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className="relative">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="white" strokeOpacity="0.92" strokeWidth="1.4" />
      <path d="M6 11a6 6 0 0 0 12 0" stroke="white" strokeOpacity="0.92" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 17v3.5M9.5 20.5h5" stroke="white" strokeOpacity="0.92" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
