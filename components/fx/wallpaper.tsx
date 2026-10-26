"use client";

import { useEffect, useRef } from "react";
import type { EffectLevel } from "@/lib/assistant/config";
import { useEffectLevel } from "./effect-level";

// Hareketli duvar kağıdı (Faz 3): parlak siyah zemin üstünde 3D derinlikli,
// canlı renkli parçalar (kapsül, küre, halka, karo) yavaşça süzülür.
// Performans: her parça BİR KEZ ışıklandırılmış bir görüntüye (sprite) çizilir;
// her karede yalnızca konum/dönüş/3D eğim değişir. Efekt seviyesi parça sayısını,
// hızı, kare hızını ve çözünürlüğü belirler; sekme gizliyken durur.

const PALETTE = ["#1fd16b", "#ffc531", "#3b7bff", "#8c52ff", "#ff5b45"];
type Shape = "kapsul" | "kure" | "halka" | "karo";

interface LevelConfig {
  /** telefon / geniş ekran parça sayısı */
  count: [number, number];
  speed: number;
  fps: number;
  dpr: number;
  parallax: number;
}

const LEVELS: Record<Exclude<EffectLevel, "kapali">, LevelConfig> = {
  tam: { count: [13, 20], speed: 1, fps: 60, dpr: 1.5, parallax: 1 },
  orta: { count: [7, 11], speed: 0.5, fps: 30, dpr: 1.25, parallax: 0.5 },
  dusuk: { count: [6, 9], speed: 0.08, fps: 8, dpr: 1, parallax: 0 },
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r},${g},${b})`;
}

/** Işıklandırılmış parça görüntüsü — ışık sol üstten, alttan renkli yansıma (kenar ışığı). */
function makeSprite(shape: Shape, color: string, size: number, blur: number): HTMLCanvasElement {
  const pad = Math.ceil(blur * 2.5) + 4;
  const w = shape === "kapsul" ? size : size;
  const h = shape === "kapsul" ? size * 0.4 : size;
  const c = document.createElement("canvas");
  c.width = Math.ceil(w + pad * 2);
  c.height = Math.ceil(h + pad * 2);
  const ctx = c.getContext("2d")!;
  if (blur > 0.5 && "filter" in ctx) ctx.filter = `blur(${blur.toFixed(1)}px)`;
  ctx.translate(pad, pad);

  if (shape === "kure") {
    const r = size / 2;
    const g = ctx.createRadialGradient(r * 0.62, r * 0.55, r * 0.05, r, r, r);
    g.addColorStop(0, shade(color, 0.75));
    g.addColorStop(0.18, shade(color, 0.25));
    g.addColorStop(0.55, color);
    g.addColorStop(0.88, shade(color, -0.55));
    g.addColorStop(1, shade(color, -0.8));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.fill();
    // alttan yansıyan zemin ışığı
    const rim = ctx.createRadialGradient(r * 1.25, r * 1.6, 0, r * 1.25, r * 1.6, r * 0.9);
    rim.addColorStop(0, shade(color, 0.35).replace("rgb", "rgba").replace(")", ",0.55)"));
    rim.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, size, size);
    // keskin parlama noktası
    ctx.globalCompositeOperation = "source-over";
    const s = ctx.createRadialGradient(r * 0.62, r * 0.5, 0, r * 0.62, r * 0.5, r * 0.28);
    s.addColorStop(0, "rgba(255,255,255,0.95)");
    s.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = s;
    ctx.beginPath();
    ctx.arc(r * 0.62, r * 0.5, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === "kapsul") {
    const rr = h / 2;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(rr, 0);
      ctx.lineTo(w - rr, 0);
      ctx.arc(w - rr, rr, rr, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(rr, h);
      ctx.arc(rr, rr, rr, Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
    };
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, shade(color, 0.55));
    g.addColorStop(0.22, shade(color, 0.12));
    g.addColorStop(0.6, color);
    g.addColorStop(0.92, shade(color, -0.6));
    g.addColorStop(1, shade(color, -0.3));
    ctx.fillStyle = g;
    path();
    ctx.fill();
    ctx.save();
    path();
    ctx.clip();
    // uç gölgeleri — silindir hissi
    const ends = ctx.createLinearGradient(0, 0, w, 0);
    ends.addColorStop(0, "rgba(0,0,0,0.45)");
    ends.addColorStop(0.12, "rgba(0,0,0,0)");
    ends.addColorStop(0.88, "rgba(0,0,0,0)");
    ends.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = ends;
    ctx.fillRect(0, 0, w, h);
    // üstte uzun parlama şeridi
    const streak = ctx.createLinearGradient(0, h * 0.12, 0, h * 0.32);
    streak.addColorStop(0, "rgba(255,255,255,0)");
    streak.addColorStop(0.5, "rgba(255,255,255,0.7)");
    streak.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = streak;
    ctx.fillRect(rr * 0.9, h * 0.1, w - rr * 1.8, h * 0.24);
    ctx.restore();
  } else if (shape === "halka") {
    const r = size / 2;
    const t = size * 0.17;
    const g = ctx.createRadialGradient(r, r, r - t, r, r, r);
    g.addColorStop(0, shade(color, -0.65));
    g.addColorStop(0.35, color);
    g.addColorStop(0.55, shade(color, 0.35));
    g.addColorStop(0.8, color);
    g.addColorStop(1, shade(color, -0.6));
    ctx.strokeStyle = g;
    ctx.lineWidth = t;
    ctx.beginPath();
    ctx.arc(r, r, r - t / 2, 0, Math.PI * 2);
    ctx.stroke();
    // sol üstte ışık yayı
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = t * 0.16;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(r, r, r - t * 0.38, Math.PI * 1.08, Math.PI * 1.42);
    ctx.stroke();
  } else {
    // karo: yuvarlatılmış, eğimli kenarlı kare
    const rad = size * 0.24;
    const rect = (x: number, y: number, s: number, rr: number) => {
      ctx.beginPath();
      ctx.roundRect(x, y, s, s, rr);
    };
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, shade(color, 0.45));
    g.addColorStop(0.45, color);
    g.addColorStop(1, shade(color, -0.65));
    ctx.fillStyle = g;
    rect(0, 0, size, rad);
    ctx.fill();
    const inset = size * 0.1;
    const top = ctx.createLinearGradient(0, inset, 0, size - inset);
    top.addColorStop(0, shade(color, 0.3));
    top.addColorStop(1, shade(color, -0.25));
    ctx.fillStyle = top;
    rect(inset, inset, size - inset * 2, rad * 0.7);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = Math.max(1, size * 0.012);
    rect(inset, inset, size - inset * 2, rad * 0.7);
    ctx.stroke();
  }
  return c;
}

interface Piece {
  sprite: HTMLCanvasElement;
  z: number;
  /** ekran oranında merkez */
  cx: number;
  cy: number;
  ax: number;
  ay: number;
  fx: number;
  fy: number;
  px: number;
  py: number;
  rot: number;
  rotSpeed: number;
  /** 3D eğim (sahte perspektif) */
  tiltSpeed: number;
  tiltPhase: number;
  alpha: number;
}

function buildPieces(count: number, base: number, dpr: number, seed = 7): Piece[] {
  const rand = mulberry32(seed);
  const shapes: Shape[] = ["kapsul", "kure", "halka", "karo", "kapsul", "kure"];
  const pieces: Piece[] = [];
  for (let i = 0; i < count; i++) {
    const z = 0.35 + rand() * 0.65;
    const shape = shapes[i % shapes.length];
    const color = PALETTE[(i * 3 + 1) % PALETTE.length];
    const size = base * (shape === "kapsul" ? 1.5 : 1) * (0.55 + z * 0.75) * (0.75 + rand() * 0.5);
    // içerik ortada okunsun diye parçalar daha çok kenarlara yerleşir
    const side = rand() < 0.5 ? rand() * 0.32 : 0.68 + rand() * 0.32;
    const horizontalEdge = rand() < 0.45;
    pieces.push({
      sprite: makeSprite(shape, color, size * dpr, (1 - z) * 12 * dpr),
      z,
      cx: horizontalEdge ? rand() : side,
      cy: horizontalEdge ? (rand() < 0.5 ? rand() * 0.22 : 0.78 + rand() * 0.22) : rand(),
      ax: 0.03 + rand() * 0.06,
      ay: 0.03 + rand() * 0.07,
      fx: 0.035 + rand() * 0.05,
      fy: 0.03 + rand() * 0.05,
      px: rand() * Math.PI * 2,
      py: rand() * Math.PI * 2,
      rot: rand() * Math.PI * 2,
      rotSpeed: (rand() - 0.5) * 0.12,
      tiltSpeed: shape === "kure" ? 0 : 0.05 + rand() * 0.08,
      tiltPhase: rand() * Math.PI * 2,
      alpha: 0.5 + z * 0.5,
    });
  }
  return pieces.sort((a, b) => a.z - b.z);
}

export function Wallpaper({ className }: { className?: string }) {
  const level = useEffectLevel();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (level === "kapali") return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cfg = LEVELS[level];
    let pieces: Piece[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let time = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, cfg.dpr);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const wide = width >= 900;
      const base = Math.min(Math.max(Math.min(width, height) * 0.2, 70), 170);
      pieces = buildPieces(cfg.count[wide ? 1 : 0], base, dpr);
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      const minDelta = 1000 / cfg.fps;
      if (last && now - last < minDelta - 1) return;
      const dt = last ? Math.min(now - last, 100) / 1000 : 0;
      last = now;
      time += dt * cfg.speed;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        const x = (p.cx + p.ax * Math.sin(time * p.fx * 6 + p.px)) * width + pointer.x * p.z * 26 * cfg.parallax;
        const y = (p.cy + p.ay * Math.sin(time * p.fy * 6 + p.py)) * height + pointer.y * p.z * 26 * cfg.parallax;
        const tilt = p.tiltSpeed ? 0.35 + 0.65 * Math.abs(Math.cos(time * p.tiltSpeed * 6 + p.tiltPhase)) : 1;
        ctx.globalAlpha = p.alpha;
        ctx.setTransform(1, 0, 0, 1, x * dpr, y * dpr);
        ctx.rotate(p.rot + time * p.rotSpeed);
        ctx.scale(1, tilt);
        ctx.drawImage(p.sprite, -p.sprite.width / 2, -p.sprite.height / 2);
      }
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
  }, [level]);

  return (
    <div aria-hidden className={`fx-floor pointer-events-none fixed inset-0 ${className ?? ""}`}>
      {level !== "kapali" && <canvas ref={ref} className="absolute inset-0 h-full w-full" />}
      {/* parçaların üstünde ince bir cam perde: içerik okunur kalsın, derinlik artsın */}
      <div className="absolute inset-0 bg-[radial-gradient(75%_55%_at_50%_45%,rgba(3,3,4,0.55),rgba(3,3,4,0.15)_70%,transparent)]" />
      {/* üst kenarda başlık okunurluğu için hafif karartma */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[rgba(3,3,4,0.7)] to-transparent" />
    </div>
  );
}
