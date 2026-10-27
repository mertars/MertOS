"use client";

import { useEffect, useRef } from "react";
import { ArrowUp, BookmarkPlus, CheckCircle2, ListPlus, RotateCcw, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Faz 3 sohbet görünümü. Asistan mesajları balonsuz, rahat okunan metin
// blokları; Mert'in mesajları sağda buzlu cam balon; sistem satırları
// ("İşaretledim", "Listeye ekledim", "Not aldım") küçük işlem kartları.

export type ChatItem =
  | { kind: "gun"; key: string; text: string }
  | { kind: "mert"; key: string; text: string; time: string }
  | { kind: "asistan"; key: string; text: string; time: string; warn?: boolean }
  | { kind: "islem"; key: string; id?: number; type: "isaret" | "liste" | "not"; title: string; detail: string; undone?: boolean };

const ACTION = {
  isaret: { icon: CheckCircle2, accent: "--fx-saglik" },
  liste: { icon: ListPlus, accent: "--fx-proje" },
  not: { icon: BookmarkPlus, accent: "--fx-hafiza" },
} as const;

/** Sohbet kaydırma alanı: açılışta ve yeni mesajda en alta iner; üst/alt kenarda yumuşakça kaybolur. */
export function ChatScroll({ children, className, watch }: { children: React.ReactNode; className?: string; watch?: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [watch]);
  return (
    <div ref={ref} className={cn("min-h-0 overflow-y-auto py-3 [mask-image:linear-gradient(180deg,transparent,#000_7%,#000_93%,transparent)]", className)}>
      {children}
    </div>
  );
}

export function ChatList({
  items,
  typing,
  compact,
  onUndo,
  onSpeak,
}: {
  items: ChatItem[];
  typing?: boolean;
  compact?: boolean;
  onUndo?: (item: Extract<ChatItem, { kind: "islem" }>) => void;
  /** Asistan mesajını sesli okut (yazarak sorulan cevaplar kendiliğinden okunmaz) */
  onSpeak?: (text: string) => void;
}) {
  return (
    <div className={cn("flex flex-col", compact ? "gap-3" : "gap-3.5")}>
      {items.map((m, i) => {
        const prev = items[i - 1];
        if (m.kind === "gun") return <DayDivider key={m.key} text={m.text} />;
        if (m.kind === "mert")
          return (
            <div key={m.key} className="fx-enter flex flex-col items-end" style={{ ["--i" as string]: Math.min(i, 8) }}>
              <div className="fx-bubble-me max-w-[80%] whitespace-pre-wrap px-4 py-2.5 text-[15px] leading-snug">{m.text}</div>
              <span className="fx-num mt-1 pr-1 text-[9.5px] text-[var(--fx-text-3)]">{m.time}</span>
            </div>
          );
        if (m.kind === "asistan") {
          const first = prev?.kind !== "asistan" && prev?.kind !== "islem";
          return (
            <div key={m.key} className="fx-enter flex gap-3" style={{ ["--i" as string]: Math.min(i, 8) }}>
              <span className="mt-1 w-[22px] shrink-0">{first && <AssistantMark />}</span>
              <div className="min-w-0 flex-1">
                {first && <p className="fx-num mb-1 text-[9.5px] tracking-[0.12em] text-[var(--fx-text-3)]">MERTOS · {m.time}</p>}
                <p
                  className={cn(
                    "whitespace-pre-wrap leading-[1.55]",
                    compact ? "text-[14.5px]" : "text-[15.5px]",
                    m.warn ? "text-[color-mix(in_srgb,var(--fx-program)_85%,white)]" : "text-[var(--fx-text)]",
                  )}
                >
                  {m.text}
                </p>
                {onSpeak && !m.warn && (
                  <button type="button" onClick={() => onSpeak(m.text)} aria-label="Sesli oku" className="-ml-2 mt-0.5 grid h-8 w-8 place-items-center text-[var(--fx-text-3)] active:text-[var(--fx-text)]">
                    <Volume2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        }
        const a = ACTION[m.type];
        const Icon = m.undone ? RotateCcw : a.icon;
        return (
          <div key={m.key} className="fx-enter flex gap-3" style={{ ["--i" as string]: Math.min(i, 8) }}>
            <span className="w-[22px] shrink-0" />
            <div
              className={cn("fx-glass flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5", m.undone && "opacity-55")}
              style={{ ["--accent" as string]: `var(${a.accent})`, ["--fx-radius" as string]: "16px" }}
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]"
                style={{ background: `color-mix(in srgb, var(${a.accent}) 18%, transparent)`, color: `var(${a.accent})` }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-tight">{m.title}</p>
                {m.detail && <p className="truncate text-[12px] text-[var(--fx-text-2)]">{m.detail}</p>}
              </div>
              {!m.undone && m.id && onUndo && (
                <button
                  type="button"
                  onClick={() => onUndo(m)}
                  className="h-8 shrink-0 rounded-full px-3 text-[11.5px] font-medium text-[var(--fx-text-2)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
                >
                  Geri al
                </button>
              )}
            </div>
          </div>
        );
      })}
      {typing && (
        <div className="flex gap-3" aria-label="Asistan yazıyor">
          <span className="mt-1 w-[22px] shrink-0">
            <AssistantMark />
          </span>
          <span className="fx-typing mt-2 flex gap-1.5">
            <i />
            <i />
            <i />
          </span>
        </div>
      )}
    </div>
  );
}

function DayDivider({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/12" />
      <span className="fx-num text-[9.5px] tracking-[0.18em] text-[var(--fx-text-3)]">{text}</span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/12" />
    </div>
  );
}

/** Asistanın küçük işareti: mikrofon küresinin minyatürü */
export function AssistantMark() {
  return (
    <span
      className="block h-[22px] w-[22px] rounded-full"
      style={{
        background: "radial-gradient(120% 120% at 50% 0%, #34343a 0%, #121214 45%, #050506 80%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 0 0 1px rgba(255,255,255,0.12), inset 0 -4px 6px rgba(255,110,85,0.25)",
      }}
    />
  );
}

export function SuggestionChips({ items, onPick, disabled }: { items: string[]; onPick?: (text: string) => void; disabled?: boolean }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] lg:mx-0 lg:px-0">
      {items.map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onPick?.(s)}
          className="fx-glass h-9 shrink-0 whitespace-nowrap px-3.5 text-[12.5px] text-[var(--fx-text-2)] transition-opacity disabled:opacity-40"
          style={{ ["--accent" as string]: "var(--fx-text)", ["--fx-radius" as string]: "999px" }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Asistana yaz…",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const filled = value.trim().length > 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (filled && !disabled) onSubmit();
      }}
      className="fx-glass flex h-[54px] items-center gap-2 pl-4 pr-1.5"
      style={{ ["--accent" as string]: "var(--fx-asistan)", ["--fx-radius" as string]: "22px" }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={2000}
        disabled={disabled}
        aria-label="Mesaj"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--fx-text)] outline-none placeholder:text-[var(--fx-text-3)] disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!filled || disabled}
        aria-label="Gönder"
        className={cn("grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full transition-colors", filled ? "bg-[var(--fx-text)] text-black" : "bg-white/[0.07] text-[var(--fx-text-3)]")}
      >
        <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </button>
    </form>
  );
}
