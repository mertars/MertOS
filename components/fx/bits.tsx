"use client";

import { cn } from "@/lib/utils";
import { CardLabel, GlassCard } from "./glass-card";

// Faz 3 ekranlarının küçük ortak parçaları.

/** Yuvarlak onay kutusu — kartın bölüm rengini (--accent) kullanır. `onToggle` yoksa salt gösterim. */
export function Check({ done, onToggle, label }: { done: boolean; onToggle?: () => void; label?: string }) {
  const dot = (
    <span
      className={cn("grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full transition-colors", done ? "text-black" : "border border-white/22")}
      style={done ? { background: "var(--accent)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)" } : undefined}
    >
      {done && (
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
          <path d="M2.5 6.5l2.2 2.2L9.5 3.8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
  if (!onToggle) return dot;
  return (
    <button type="button" onClick={onToggle} aria-pressed={done} aria-label={label} className="-m-3 grid h-11 w-11 shrink-0 place-items-center">
      {dot}
    </button>
  );
}

export function Ring({ value, color, size, stroke = 7, children }: { value: number; color: string; size: number; stroke?: number; children: React.ReactNode }) {
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        {v > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * v} ${c}`}
            className="fx-ring-draw"
            style={{ ["--len" as string]: `${c}` }}
          />
        )}
      </svg>
      <div className="relative flex flex-col items-center leading-tight">{children}</div>
    </div>
  );
}

export function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="fx-chip !h-6 !text-[10px]" style={{ ["--accent" as string]: `var(${color})` }}>
      {children}
    </span>
  );
}

export function StatTile({ label, value, accent, index, className }: { label: string; value: string; accent: string; index: number; className?: string }) {
  return (
    <GlassCard accent={accent} index={index} className={cn("p-3", className)}>
      <CardLabel className="!text-[9.5px]">{label}</CardLabel>
      <p className="fx-num mt-1.5 text-[20px] leading-none">{value}</p>
    </GlassCard>
  );
}

export function MiniBar({ label, value, ratio, color }: { label: string; value: string; ratio: number; color: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between text-[11.5px]">
        <span className="text-[var(--fx-text-2)]">{label}</span>
        <span className="fx-num text-[11px]">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, background: `var(${color})` }} />
      </div>
    </div>
  );
}

export function SectionTitle({ eyebrow, title, right }: { eyebrow: string; title: string; right?: React.ReactNode }) {
  return (
    <header className="fx-enter mb-4 flex items-end justify-between pt-[max(env(safe-area-inset-top),18px)] lg:pt-2">
      <div>
        <p className="fx-num text-[10.5px] uppercase tracking-[0.12em] text-[var(--fx-text-3)]">{eyebrow}</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-none tracking-tight">{title}</h1>
      </div>
      {right}
    </header>
  );
}

/** Çevrimdışı / hata / veritabanı yok bildirimi */
export function Notice({ tone = "uyari", children, action }: { tone?: "uyari" | "bilgi"; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div
      className="fx-glass mb-3 flex items-center gap-3 px-4 py-3 text-[13px] text-[var(--fx-text-2)]"
      style={{ ["--accent" as string]: tone === "uyari" ? "var(--fx-program)" : "var(--fx-text)", ["--fx-radius" as string]: "16px" }}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}
