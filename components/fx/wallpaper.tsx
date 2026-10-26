"use client";

import { useEffect, useRef } from "react";
import type { BackgroundChoice, EffectLevel } from "@/lib/assistant/config";
import { useBackgroundChoice, useEffectLevel } from "./effect-level";

// Hareketli arka plan (Faz 3). Mert renkli 3D parçaları reddetti (26 Ekim 2026);
// yerine iki sade-gösterişli seçenek:
//  - "dalga": parlak siyah üstünde ince ışık çizgilerinden 3D dalga yüzeyi;
//    öndeki çizgi arkadakini örter (gerçek derinlik), üstünde yumuşak bir ışık gezer.
//  - "toz": cilalı siyah yüzeyde yavaşça kayan ışık yansımaları + derinlikte
//    süzülen ince toz zerreleri.
// Efekt seviyesi çizgi/zerre sayısını, hızı, kare hızını ve çözünürlüğü belirler;
// "kapali"da canvas hiç yok; sekme gizliyken çizim durur.

export type WallpaperVariant = BackgroundChoice;

interface LevelConfig {
  lines: number;
  dust: number;
  speed: number;
  fps: number;
  dpr: number;
  parallax: number;
}

const LEVELS: Record<Exclude<EffectLevel, "kapali">, LevelConfig> = {
  tam: { lines: 38, dust: 150, speed: 1, fps: 60, dpr: 1.5, parallax: 1 },
  orta: { lines: 26, dust: 80, speed: 0.55, fps: 30, dpr: 1.25, parallax: 0.5 },
  dusuk: { lines: 18, dust: 40, speed: 0.1, fps: 10, dpr: 1, parallax: 0 },
};

const BG = "#030304";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dalga yüksekliği: üç yavaş sinüsün toplamı (x: 0..1, z: 0..1 derinlik) */
function wave(x: number, z: number, t: number): number {
  return (
    Math.sin(x * 5.2 + t * 0.35 + z * 2.1) * 0.55 +
    Math.sin(x * 11.3 - t * 0.22 + z * 4.7) * 0.25 +
    Math.sin(x * 2.1 + z * 7.3 + t * 0.15) * 0.45
  );
}

function drawWaves(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, cfg: LevelConfig, px: number, py: number) {
  const n = cfg.lines;
  const horizon = h * 0.34 + py * 10;
  const steps = Math.max(60, Math.round(w / 9));
  // gezen ışık: soldan sağa çok yavaş, geri döner
  const light = 0.5 + 0.42 * Math.sin(t * 0.12);
  for (let i = 0; i < n; i++) {
    const d = i / (n - 1); // 0 uzak → 1 yakın
    const base = horizon + (h - horizon) * Math.pow(d, 1.55);
    const amp = h * (0.012 + d * 0.06);
    const spread = 0.08 + d * 0.32; // yakın çizgiler ekranın dışına taşar (perspektif)
    ctx.beginPath();
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const x = (-spread + u * (1 + spread * 2)) * w + px * d * 30;
      const y = base - amp * wave(u, d, t);
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    // arkadaki çizgileri örtmek için çizginin altını zeminle doldur
    ctx.lineTo(w * (1 + spread) + 40, h + 40);
    ctx.lineTo(-w * spread - 40, h + 40);
    ctx.closePath();
    ctx.fillStyle = BG;
    ctx.fill();

    const g = ctx.createLinearGradient(0, 0, w, 0);
    const a = 0.05 + d * 0.16;
    g.addColorStop(0, `rgba(255,255,255,${a * 0.35})`);
    g.addColorStop(Math.max(0, light - 0.22), `rgba(255,255,255,${a * 0.6})`);
    g.addColorStop(light, `rgba(255,236,214,${Math.min(0.75, a * 2.6)})`);
    g.addColorStop(Math.min(1, light + 0.22), `rgba(255,255,255,${a * 0.6})`);
    g.addColorStop(1, `rgba(255,255,255,${a * 0.35})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = 0.6 + d * 1.1;
    ctx.stroke();
  }
}

interface Mote {
  x: number;
  y: number;
  z: number;
  vy: number;
  sway: number;
  phase: number;
  size: number;
}

function makeDust(count: number, seed = 11): Mote[] {
  const r = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    x: r() * 2 - 1,
    y: r() * 2 - 1,
    z: 0.15 + r() * 0.85,
    vy: 0.006 + r() * 0.014,
    sway: 0.02 + r() * 0.04,
    phase: r() * Math.PI * 2,
    size: 0.5 + r() * 1.3,
  }));
}

function drawDust(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number, motes: Mote[], px: number, py: number) {
  // cilalı yüzeyde kayan geniş, yumuşak ışık yansımaları
  const sheens = [
    { x: 0.25 + 0.2 * Math.sin(t * 0.05), y: 0.2 + 0.08 * Math.cos(t * 0.04), rx: 0.9, ry: 0.22, a: 0.075, rot: -0.35 },
    { x: 0.8 + 0.15 * Math.cos(t * 0.035), y: 0.72 + 0.1 * Math.sin(t * 0.03), rx: 0.75, ry: 0.18, a: 0.05, rot: 0.4 },
  ];
  for (const s of sheens) {
    ctx.save();
    ctx.translate(s.x * w, s.y * h);
    ctx.rotate(s.rot);
    ctx.scale(1, s.ry / s.rx);
    const r = s.rx * Math.max(w, h) * 0.6;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(255,248,240,${s.a})`);
    g.addColorStop(0.45, `rgba(255,248,240,${s.a * 0.35})`);
    g.addColorStop(1, "rgba(255,248,240,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }
  // perspektifli toz: uzaktakiler küçük, sönük ve yavaş
  const cx = w / 2;
  const cy = h / 2;
  const focal = Math.max(w, h) * 0.55;
  for (const m of motes) {
    m.y -= m.vy * dt * (0.4 + m.z);
    if (m.y < -1.1) m.y = 1.1;
    const sx = cx + ((m.x + Math.sin(t * 0.3 + m.phase) * m.sway) * focal) / (1.6 - m.z) + px * m.z * 22;
    const sy = cy + (m.y * focal) / (1.6 - m.z) + py * m.z * 22;
    if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) continue;
    const twinkle = 0.65 + 0.35 * Math.sin(t * 1.3 + m.phase * 3);
    ctx.globalAlpha = (0.12 + m.z * 0.55) * twinkle;
    ctx.fillStyle = m.z > 0.8 ? "#fff3e6" : "#ffffff";
    ctx.beginPath();
    ctx.arc(sx, sy, m.size * (0.4 + m.z * 0.9), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** `variant` verilmezse ayardaki seçim (Ayarlar > Görünüm). */
export function Wallpaper({ variant: forced, className }: { variant?: WallpaperVariant; className?: string }) {
  const level = useEffectLevel();
  const chosen = useBackgroundChoice();
  const variant = forced ?? chosen;
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (level === "kapali") return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const cfg = LEVELS[level];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let time = 0;
    const motes = makeDust(cfg.dust);
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, cfg.dpr);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      if (last && now - last < 1000 / cfg.fps - 1) return;
      const dt = last ? Math.min(now - last, 100) / 1000 : 0;
      last = now;
      time += dt * cfg.speed;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const px = pointer.x * cfg.parallax;
      const py = pointer.y * cfg.parallax;
      if (variant === "dalga") drawWaves(ctx, width, height, time, cfg, px, py);
      else drawDust(ctx, width, height, time, dt * cfg.speed, motes, px, py);
    };

    const onPointer = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    if (cfg.parallax) window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [level, variant]);

  return (
    <div aria-hidden className={`fx-floor pointer-events-none fixed inset-0 ${className ?? ""}`}>
      {level !== "kapali" && <canvas ref={ref} className="absolute inset-0 h-full w-full" />}
    </div>
  );
}
