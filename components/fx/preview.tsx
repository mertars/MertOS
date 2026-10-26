"use client";

import { useEffect, useRef, useState } from "react";
import { Brain, CalendarDays, FolderGit2, HeartPulse, MessageCircle, Settings2, Sparkles } from "lucide-react";
import type { EffectLevel } from "@/lib/assistant/config";
import { cn } from "@/lib/utils";
import { EffectLevelProvider } from "./effect-level";
import { CardLabel, GlassCard } from "./glass-card";
import { MicOrb, type MicSource } from "./mic-orb";
import { Wallpaper } from "./wallpaper";

// Faz 3 tasarım ÖNİZLEMESİ (onay için — docs/gorev-dosyasi/faz-3-tasarim.md
// "Uygulamadan önce ana ekranın ve mikrofonun ekran görüntüsünü göster").
// Veri sabittir: senaryolardaki örnek gün (26 Ekim Pazartesi, koşu günü).
// Onaydan sonra bu bileşenler gerçek veriye bağlanıp uygulamaya taşınır.

export type PreviewScreen = "bugun" | "asistan";

const DECISION = "Mert Bey, koşu günü: 6,5 km Zone 2 koşu. Öğle: kalan mercimek çorbası (ocak).";

const PROGRAM = [
  { time: "06:00", title: "Uyanış", done: true },
  { time: "06:05", title: "Buzlu suya yüz", done: true },
  { time: "06:10", title: "Su içme", done: true },
  { time: "06:15", title: "Soğuk duş", done: false },
  { time: "06:30", title: "Koşu — 6,5 km Zone 2", done: false },
  { time: "13:00", title: "Öğle yemeği", done: false },
  { time: "20:30", title: "Temizlik", done: false },
];

const CHAT = [
  { role: "user", text: "Bugün koşmadım." },
  { role: "assistant", text: "Tamam Mert Bey, olur böyle günler. Akşam 20 dakikalık hafif bir yürüyüş ister misiniz?" },
  { role: "user", text: "Olur, akşam 8'de yaparım." },
  { role: "assistant", text: "Süper Mert Bey, bugün 20:00'ye listeye ekledim." },
  { role: "not", text: "Listeye ekledim: 20 dk hafif yürüyüş — bugün 20:00" },
] as const;

export function DesignPreview({ screen, efekt, speaking }: { screen: PreviewScreen; efekt?: EffectLevel; speaking: boolean }) {
  const [active, setActive] = useState(speaking);
  const [source, setSource] = useState<MicSource>(speaking ? "demo" : null);
  const streamRef = useRef<MediaStream | null>(null);

  // Mikrofona dokununca gerçek mikrofon denenir; izin yoksa yapay sinyal.
  async function toggleMic() {
    if (active) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setActive(false);
      return;
    }
    setActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ac = new AudioContext();
      const an = ac.createAnalyser();
      an.fftSize = 256;
      an.smoothingTimeConstant = 0.6;
      ac.createMediaStreamSource(stream).connect(an);
      setSource(an);
    } catch {
      setSource("demo");
    }
  }

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  return (
    <EffectLevelProvider level={efekt} className="fx relative min-h-dvh lg:h-dvh lg:overflow-hidden">
      <Wallpaper />
      {/* Telefon */}
      <div className="relative lg:hidden">
        {screen === "bugun" ? <PhoneToday /> : <PhoneAssistant active={active} source={source} onMic={toggleMic} />}
        {screen === "bugun" && (
          <div className="fixed bottom-[92px] right-4 z-30">
            <MicOrb size={68} active={active} source={source} onClick={toggleMic} />
          </div>
        )}
        <PhoneTabBar current={screen} />
      </div>
      {/* Bilgisayar */}
      <div className="relative hidden h-full lg:flex lg:flex-col">
        <DesktopShell active={active} source={source} onMic={toggleMic} />
      </div>
    </EffectLevelProvider>
  );
}

// ---------------------------------------------------------------------------
// Telefon — Bugün

function PhoneToday() {
  const done = PROGRAM.filter((p) => p.done).length;
  return (
    <main className="relative z-10 px-4 pb-44 pt-[max(env(safe-area-inset-top),18px)]">
      <header className="fx-enter mb-4 flex items-end justify-between" style={{ ["--i" as string]: 0 }}>
        <div>
          <p className="fx-num text-[11px] text-[var(--fx-text-3)]">PZT · 26.10 · 07:12</p>
          <h1 className="mt-1 text-[30px] font-semibold leading-none tracking-tight">Günaydın,</h1>
          <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-[var(--fx-text-2)]">Mert Bey</h1>
        </div>
        <span className="fx-glass grid h-11 w-11 place-items-center rounded-full" style={{ ["--accent" as string]: "var(--fx-text)" }}>
          <Settings2 className="h-[18px] w-[18px] text-[var(--fx-text-2)]" />
        </span>
      </header>

      {/* Günün kararı — tek cümle, koddan */}
      <GlassCard accent="--fx-program" index={1} className="mb-3 p-5">
        <div className="flex items-center justify-between">
          <span className="fx-chip">
            <Sparkles className="h-3 w-3" /> Günün kararı
          </span>
          <span className="fx-num text-[11px] text-[var(--fx-text-3)]">KOD · LLM YOK</span>
        </div>
        <p className="mt-3 text-[19px] font-medium leading-snug">{DECISION}</p>
        <div className="mt-4 flex gap-2 text-[11.5px]">
          <Pill color="--fx-saglik">Koşu günü</Pill>
          <Pill color="--fx-program">Toplu pişirme · 2 porsiyon kaldı</Pill>
        </div>
      </GlassCard>

      {/* Geniş-dar: uzun program kartı + sağda iki küçük kart */}
      <div className="mb-3 grid grid-cols-[1.35fr_1fr] gap-3">
        <GlassCard accent="--fx-program" index={2} className="row-span-2 p-4">
          <CardLabel>Program</CardLabel>
          <ul className="mt-3 space-y-2.5">
            {PROGRAM.slice(0, 6).map((p) => (
              <li key={p.time} className="flex items-center gap-2.5">
                <span className="fx-num w-10 text-[10.5px] text-[var(--fx-text-3)]">{p.time}</span>
                <span className={cn("flex-1 text-[13px] leading-tight", p.done && "text-[var(--fx-text-3)] line-through")}>{p.title}</span>
                <Check done={p.done} />
              </li>
            ))}
          </ul>
        </GlassCard>
        <GlassCard accent="--fx-program" index={3} className="grid place-items-center p-3">
          <Ring value={done / PROGRAM.length} color="var(--fx-program)" size={92}>
            <span className="fx-num text-[20px] font-medium">
              {done}/{PROGRAM.length}
            </span>
            <span className="text-[9.5px] uppercase tracking-[0.14em] text-[var(--fx-text-3)]">rutin</span>
          </Ring>
        </GlassCard>
        <GlassCard accent="--fx-saglik" index={4} className="p-3.5">
          <CardLabel>Koşu</CardLabel>
          <p className="fx-num mt-2 text-[26px] font-medium leading-none">6,5</p>
          <p className="text-[11px] text-[var(--fx-text-2)]">km · Zone 2</p>
          <p className="fx-num mt-2 text-[10.5px] text-[var(--fx-text-3)]">♥ 155–160</p>
        </GlassCard>
      </div>

      {/* 3x1 şerit */}
      <div className="mb-3 grid grid-cols-3 gap-3">
        <Stat index={5} accent="--fx-saglik" label="Koşu" value="1/4" />
        <Stat index={6} accent="--fx-hafiza" label="Yürüyüş" value="2/3" />
        <Stat index={7} accent="--fx-program" label="Rutin" value="%62" />
      </div>

      {/* Geniş-dar: öğün + temizlik */}
      <div className="mb-3 grid grid-cols-[1fr_0.62fr] gap-3">
        <GlassCard accent="--fx-asistan" index={8}>
          <CardLabel>Öğünler</CardLabel>
          <MealRow time="08:00" name="Muzlu yulaf" meta="5 dk" />
          <MealRow time="13:00" name="Kalan mercimek" meta="24 Ekim · ocak" highlight />
          <MealRow time="19:30" name="Airfryer tavuk" meta="30 dk · 2 öğün" />
        </GlassCard>
        <GlassCard accent="--fx-program" index={9} className="flex flex-col justify-between">
          <CardLabel>Temizlik</CardLabel>
          <p className="mt-2 text-[14px] leading-snug">Bulaşık</p>
          <p className="text-[14px] leading-snug text-[var(--fx-text-2)]">Çamaşır</p>
          <p className="fx-num mt-2 text-[10.5px] text-[var(--fx-text-3)]">20:30</p>
        </GlassCard>
      </div>

      {/* Yapılacaklar + hafıza teaser */}
      <div className="grid grid-cols-[0.9fr_1fr] gap-3">
        <GlassCard accent="--fx-hafiza" index={10}>
          <CardLabel>Hafızam</CardLabel>
          <p className="fx-num mt-2 text-[24px] leading-none">12</p>
          <p className="text-[11px] text-[var(--fx-text-2)]">not</p>
          <p className="mt-2 text-[12px] leading-snug text-[var(--fx-text-2)]">“Ispanağı sevmiyor.”</p>
        </GlassCard>
        <GlassCard accent="--fx-proje" index={11}>
          <CardLabel>Yapılacaklar</CardLabel>
          <ul className="mt-2 space-y-2">
            <li className="flex items-center gap-2 text-[12.5px]">
              <span className="fx-num text-[10.5px] text-[var(--fx-text-3)]">20:00</span> <span className="flex-1">20 dk hafif yürüyüş</span>
              <Check done={false} />
            </li>
            <li className="flex items-center gap-2 text-[12.5px]">
              <span className="fx-num text-[10.5px] text-[var(--fx-text-3)]">——</span> <span className="flex-1">Market alışverişi</span>
              <Check done />
            </li>
          </ul>
        </GlassCard>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Telefon — Asistan (mikrofon alt yarıda, tek elle)

function PhoneAssistant({ active, source, onMic }: { active: boolean; source: MicSource; onMic: () => void }) {
  return (
    <main className="relative z-10 flex min-h-dvh flex-col px-4 pb-[112px] pt-[max(env(safe-area-inset-top),18px)]">
      <header className="fx-enter flex items-center justify-between">
        <div>
          <p className="fx-num text-[11px] text-[var(--fx-text-3)]">ASİSTAN · 20:04</p>
          <h1 className="text-[26px] font-semibold tracking-tight">Konuşalım</h1>
        </div>
        <span className="fx-chip" style={{ ["--accent" as string]: "var(--fx-hafiza)" }}>
          <Brain className="h-3 w-3" /> 12 not
        </span>
      </header>
      <div className="mt-4 flex-1 space-y-2.5">
        <ChatBubbles />
      </div>
      {/* alt yarı: mikrofon + canlı yazıya döküm */}
      <div className="mt-6 flex flex-col items-center">
        <p className={cn("mb-7 h-10 max-w-[280px] text-center text-[15px] leading-snug transition-opacity duration-500", active ? "opacity-100" : "opacity-0")}>
          <span className="text-[var(--fx-text)]">Yarın sabah koşudan önce</span> <span className="text-[var(--fx-text-3)]">ne yesem…</span>
        </p>
        <MicOrb size={148} active={active} source={source} onClick={onMic} label={active ? "Konuşmayı bitir" : "Konuş"} />
        <p className="fx-num mt-8 text-[10.5px] tracking-[0.2em] text-[var(--fx-text-3)]">{active ? "DİNLİYORUM" : "DOKUN VE KONUŞ"}</p>
      </div>
    </main>
  );
}

function ChatBubbles({ compact }: { compact?: boolean }) {
  return (
    <>
      {CHAT.map((m, i) =>
        m.role === "not" ? (
          <p key={i} className="fx-enter text-center text-[11.5px] text-[color-mix(in_srgb,var(--fx-proje)_75%,white)]" style={{ ["--i" as string]: i + 1 }}>
            ＋ {m.text}
          </p>
        ) : (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "fx-enter max-w-[82%] px-4 py-2.5 leading-snug",
                compact ? "text-[13.5px]" : "text-[14.5px]",
                m.role === "user" ? "rounded-[20px] rounded-br-[6px] bg-[var(--fx-text)] text-black" : "fx-glass rounded-[20px] rounded-bl-[6px]",
              )}
              style={{ ["--i" as string]: i + 1, ["--accent" as string]: "var(--fx-asistan)", ...(m.role === "assistant" ? { ["--fx-radius" as string]: "20px" } : {}) }}
            >
              {m.text}
            </div>
          </div>
        ),
      )}
    </>
  );
}

const TABS = [
  { id: "asistan", label: "Asistan", icon: MessageCircle, color: "--fx-asistan" },
  { id: "bugun", label: "Bugün", icon: CalendarDays, color: "--fx-program" },
  { id: "saglik", label: "Sağlık", icon: HeartPulse, color: "--fx-saglik" },
  { id: "projeler", label: "Projeler", icon: FolderGit2, color: "--fx-proje" },
  { id: "hafizam", label: "Hafızam", icon: Brain, color: "--fx-hafiza" },
] as const;

function PhoneTabBar({ current }: { current: string }) {
  return (
    <nav className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),12px)] z-20">
      <div className="fx-glass flex h-[68px] items-stretch justify-around rounded-[24px] px-1" style={{ ["--accent" as string]: "var(--fx-text)", ["--fx-radius" as string]: "24px" }}>
        {TABS.map((t) => {
          const on = t.id === current;
          const Icon = t.icon;
          return (
            <span key={t.id} className="relative flex flex-1 flex-col items-center justify-center gap-1">
              {on && (
                <span
                  className="absolute inset-x-1.5 inset-y-2 rounded-[16px]"
                  style={{ background: `color-mix(in srgb, var(${t.color}) 16%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, var(${t.color}) 40%, transparent)` }}
                />
              )}
              <Icon className="relative h-[19px] w-[19px]" style={{ color: on ? `var(${t.color})` : "var(--fx-text-3)" }} />
              <span className={cn("relative text-[10.5px] font-medium", on ? "text-[var(--fx-text)]" : "text-[var(--fx-text-3)]")}>{t.label}</span>
            </span>
          );
        })}
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Bilgisayar — tüm ekran, kaydırma yok. Sol sağlık, orta mikrofon + sohbet, sağ program + projeler.

function DesktopShell({ active, source, onMic }: { active: boolean; source: MicSource; onMic: () => void }) {
  return (
    <>
      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between px-7">
        <div className="flex items-center gap-3">
          <span className="text-[17px] font-semibold tracking-[0.18em]">MERTOS</span>
          <span className="fx-num text-[11px] text-[var(--fx-text-3)]">PZT 26.10.2026 · 20:04</span>
        </div>
        <nav className="fx-glass flex gap-1 rounded-full p-1" style={{ ["--accent" as string]: "var(--fx-text)", ["--fx-radius" as string]: "999px" }}>
          {[
            { l: "Asistan", c: "--fx-asistan", on: true },
            { l: "Hafızam", c: "--fx-hafiza" },
            { l: "Ayarlar", c: "--fx-text" },
          ].map((t) => (
            <span
              key={t.l}
              className={cn("rounded-full px-5 py-1.5 text-[13px] font-medium", t.on ? "text-[var(--fx-text)]" : "text-[var(--fx-text-3)]")}
              style={t.on ? { background: `color-mix(in srgb, var(${t.c}) 18%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, var(${t.c}) 45%, transparent)` } : undefined}
            >
              {t.l}
            </span>
          ))}
        </nav>
        <span className="w-[200px]" />
      </header>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-[minmax(300px,1fr)_minmax(420px,1.25fr)_minmax(300px,1fr)] gap-5 px-7 pb-7">
        {/* Sol: sağlık */}
        <div className="grid min-h-0 grid-rows-[auto_auto_1fr] gap-4">
          <GlassCard accent="--fx-saglik" index={1} className="p-5">
            <CardLabel>Sağlık · bu hafta</CardLabel>
            <div className="mt-4 flex items-center gap-5">
              <Ring value={0.25} color="var(--fx-saglik)" size={108}>
                <span className="fx-num text-[24px]">1/4</span>
                <span className="text-[9.5px] uppercase tracking-[0.14em] text-[var(--fx-text-3)]">koşu</span>
              </Ring>
              <div className="space-y-3">
                <MiniBar label="Yürüyüş" value="2/3" ratio={0.66} color="--fx-hafiza" />
                <MiniBar label="Rutin" value="%62" ratio={0.62} color="--fx-program" />
                <MiniBar label="Öğün kaydı" value="7/21" ratio={0.33} color="--fx-asistan" />
              </div>
            </div>
          </GlassCard>
          <div className="grid grid-cols-2 gap-4">
            <GlassCard accent="--fx-saglik" index={2}>
              <CardLabel>Bugün</CardLabel>
              <p className="fx-num mt-2 text-[28px] leading-none">6,5</p>
              <p className="text-[11.5px] text-[var(--fx-text-2)]">km Zone 2 koşu</p>
            </GlassCard>
            <GlassCard accent="--fx-saglik" index={3}>
              <CardLabel>Nabız hedefi</CardLabel>
              <p className="fx-num mt-2 text-[22px] leading-none">155–160</p>
              <p className="text-[11.5px] text-[var(--fx-text-2)]">üst sınır</p>
            </GlassCard>
          </div>
          <GlassCard accent="--fx-saglik" index={4} className="min-h-0">
            <CardLabel>Son 7 gün</CardLabel>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {["S", "Ç", "P", "C", "C", "P", "P"].map((d, i) => {
                const v = [1, 1, 0, 1, 0.4, 1, 0.6][i];
                return (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="relative h-24 w-full overflow-hidden rounded-[10px] bg-white/[0.04]">
                      <div className="absolute inset-x-0 bottom-0 rounded-[10px]" style={{ height: `${v * 100}%`, background: "linear-gradient(180deg, var(--fx-saglik), color-mix(in srgb, var(--fx-saglik) 30%, black))" }} />
                    </div>
                    <span className="fx-num text-[10px] text-[var(--fx-text-3)]">{d}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[12.5px] leading-snug text-[var(--fx-text-2)]">Pazar koşusu tamam. Bu hafta 3 koşu daha var: Çar, Cum, Paz.</p>
          </GlassCard>
        </div>

        {/* Orta: büyük mikrofon, altında sohbet */}
        <div className="flex min-h-0 flex-col">
          <div className="flex shrink-0 flex-col items-center pt-6">
            <MicOrb size={190} active={active} source={source} onClick={onMic} label={active ? "Konuşmayı bitir" : "Konuş"} />
            <p className="fx-num mt-12 text-[11px] tracking-[0.22em] text-[var(--fx-text-3)]">{active ? "DİNLİYORUM" : "DOKUN VE KONUŞ"}</p>
          </div>
          <div className="mt-6 min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
            <ChatBubbles compact />
          </div>
          <div className="fx-glass mt-3 flex h-12 shrink-0 items-center px-4 text-[14px] text-[var(--fx-text-3)]" style={{ ["--accent" as string]: "var(--fx-asistan)", ["--fx-radius" as string]: "16px" }}>
            Asistana yaz…
          </div>
        </div>

        {/* Sağ: günün programı + projeler */}
        <div className="grid min-h-0 grid-rows-[auto_1fr_auto] gap-4">
          <GlassCard accent="--fx-program" index={2} className="p-5">
            <span className="fx-chip">
              <Sparkles className="h-3 w-3" /> Günün kararı
            </span>
            <p className="mt-3 text-[17px] font-medium leading-snug">{DECISION}</p>
          </GlassCard>
          <GlassCard accent="--fx-program" index={3} className="min-h-0">
            <div className="flex items-baseline justify-between">
              <CardLabel>Günün programı</CardLabel>
              <span className="fx-num text-[12px] text-[var(--fx-text-2)]">3/7</span>
            </div>
            <ul className="mt-3 space-y-2.5">
              {PROGRAM.map((p) => (
                <li key={p.time} className="flex items-center gap-3">
                  <span className="fx-num w-11 text-[11px] text-[var(--fx-text-3)]">{p.time}</span>
                  <span className={cn("flex-1 text-[13.5px]", p.done && "text-[var(--fx-text-3)] line-through")}>{p.title}</span>
                  <Check done={p.done} />
                </li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard accent="--fx-proje" index={4}>
            <div className="flex items-baseline justify-between">
              <CardLabel>Projeler</CardLabel>
              <span className="fx-num text-[10.5px] text-[var(--fx-text-3)]">FAZ 5</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ProjectTile name="MertOS" state="Faz 3 · tasarım" />
              <ProjectTile name="GitHub" state="bağlanacak" muted />
            </div>
          </GlassCard>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Küçük parçalar

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="fx-chip !h-6 !text-[10px]" style={{ ["--accent" as string]: `var(${color})` }}>
      {children}
    </span>
  );
}

function Check({ done }: { done: boolean }) {
  return (
    <span
      className={cn("grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full", done ? "text-black" : "border border-white/20")}
      style={done ? { background: "var(--accent)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)" } : undefined}
    >
      {done && (
        <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
          <path d="M2.5 6.5l2.2 2.2L9.5 3.8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function Ring({ value, color, size, children }: { value: number; color: string; size: number; children: React.ReactNode }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="7" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * value} ${c}`}
          className="fx-ring-draw"
          style={{ ["--len" as string]: `${c}` }}
        />
      </svg>
      <div className="relative flex flex-col items-center leading-tight">{children}</div>
    </div>
  );
}

function Stat({ label, value, accent, index }: { label: string; value: string; accent: string; index: number }) {
  return (
    <GlassCard accent={accent} index={index} className="p-3">
      <CardLabel className="!text-[9.5px]">{label}</CardLabel>
      <p className="fx-num mt-1.5 text-[20px] leading-none">{value}</p>
    </GlassCard>
  );
}

function MealRow({ time, name, meta, highlight }: { time: string; name: string; meta: string; highlight?: boolean }) {
  return (
    <div className="mt-2.5 flex items-baseline gap-2">
      <span className="fx-num w-10 text-[10.5px] text-[var(--fx-text-3)]">{time}</span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[13.5px] leading-tight", highlight && "font-semibold")}>{name}</p>
        <p className="text-[10.5px] text-[var(--fx-text-3)]">{meta}</p>
      </div>
    </div>
  );
}

function MiniBar({ label, value, ratio, color }: { label: string; value: string; ratio: number; color: string }) {
  return (
    <div className="w-36">
      <div className="flex items-baseline justify-between text-[11.5px]">
        <span className="text-[var(--fx-text-2)]">{label}</span>
        <span className="fx-num text-[11px]">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, background: `var(${color})` }} />
      </div>
    </div>
  );
}

function ProjectTile({ name, state, muted }: { name: string; state: string; muted?: boolean }) {
  return (
    <div className="rounded-[16px] bg-white/[0.04] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
      <p className={cn("text-[13.5px] font-semibold", muted && "text-[var(--fx-text-2)]")}>{name}</p>
      <p className="text-[11px] text-[var(--fx-text-3)]">{state}</p>
    </div>
  );
}
