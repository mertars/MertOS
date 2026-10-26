"use client";

import { useState, useSyncExternalStore } from "react";
import { Volume2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import type { VoiceChoice } from "@/lib/assistant/config";
import { useAssistantSettings, saveAssistantSettings } from "@/lib/assistant/use-settings";
import { speak, unlockVoice } from "@/lib/assistant/voice";
import { useToastStore } from "@/lib/store/toast-store";

/**
 * Ayarlar > Ses (Faz 4): okuma sesi (tarayıcının hazır sesi / Gemini sesi —
 * ikisi de "Dinle" ile denenir), sesli okuma ve planlı konuşma aç/kapa.
 * Gemini sesi alınamazsa uygulama kendiliğinden tarayıcı sesine döner.
 */
export function VoiceCard() {
  const settings = useAssistantSettings();
  const push = useToastStore((s) => s.push);
  const [testing, setTesting] = useState<VoiceChoice | null>(null);
  const recognition = useSyncExternalStore(
    () => () => {},
    () => "SpeechRecognition" in window || "webkitSpeechRecognition" in window,
    () => true,
  );

  async function save(patch: Parameters<typeof saveAssistantSettings>[0]) {
    try {
      await saveAssistantSettings(patch);
    } catch (e) {
      push({ title: "Kaydedilemedi", description: e instanceof Error ? e.message : undefined, variant: "danger" });
    }
  }

  async function listen(choice: VoiceChoice) {
    unlockVoice();
    setTesting(choice);
    const via = await speak(`${settings.hitap}, öğle yemeği vaktiniz geldi. Kalan mercimek çorbası var, mikrodalgada üç dakikada hazır.`, choice);
    setTesting(null);
    if (choice === "gemini" && via !== "gemini")
      push({
        title: "Gemini sesi alınamadı",
        description: via === "tarayici" ? "Tarayıcı sesiyle okundu (kota, ağ ya da anahtar)." : "Tarayıcı sesi de çalışmadı — cevaplar yazı olarak kalır.",
        variant: "danger",
      });
    else if (via === "yok") push({ title: "Bu cihazda sesli okuma çalışmadı", description: "Cevaplar yazı olarak kalır.", variant: "danger" });
  }

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2.5">
        <Volume2 className="h-4 w-4 text-[var(--color-text-secondary)]" />
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">Ses</span>
      </div>
      <p className="mb-1.5 text-[12px] text-[var(--color-text-secondary)]">Okuma sesi</p>
      <Segmented<VoiceChoice>
        value={settings.ses}
        onChange={(ses) => save({ ses })}
        options={[
          { value: "tarayici", label: "Tarayıcı" },
          { value: "gemini", label: "Gemini" },
        ]}
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["tarayici", "gemini"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => listen(c)}
            disabled={testing !== null}
            className="h-10 rounded-[12px] border border-[var(--color-border-strong)] text-[13px] text-[var(--color-text-secondary)] disabled:opacity-50"
          >
            {testing === c ? "Okunuyor…" : `Dinle: ${c === "tarayici" ? "Tarayıcı" : "Gemini"}`}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11.5px] leading-snug text-[var(--color-text-tertiary)]">
        Gemini sesi daha doğal ama her okuma ücretli bir çağrıdır ve günlük sınıra sayılır; alınamazsa tarayıcı sesine dönülür.
      </p>

      <label className="mt-4 flex items-center justify-between gap-3">
        <span>
          <span className="block text-[14px]">Cevapları sesli oku</span>
          <span className="block text-[11.5px] text-[var(--color-text-tertiary)]">Mikrofonla sorulana ve planlı konuşmalara. Kapalıysa yalnızca yazı.</span>
        </span>
        <Switch checked={settings.sesliOkuma} onCheckedChange={(sesliOkuma) => save({ sesliOkuma })} />
      </label>
      <label className="mt-3 flex items-center justify-between gap-3">
        <span>
          <span className="block text-[14px]">Planlı konuşmalar</span>
          <span className="block text-[11.5px] text-[var(--color-text-tertiary)]">
            Program saatlerinde asistan kendiliğinden konuşur — yalnızca uygulama açıkken (bildirim yok).
          </span>
        </span>
        <Switch checked={settings.proaktif} onCheckedChange={(proaktif) => save({ proaktif })} />
      </label>

      {!recognition && (
        <p className="mt-4 rounded-[12px] bg-white/[0.04] p-3 text-[12px] leading-snug text-[var(--color-text-secondary)]">
          Bu tarayıcı konuşmayı yazıya çeviremiyor. Yazı kutusuna dokunup klavyedeki mikrofon tuşuyla konuşabilirsiniz (iPhone: klavyenin sağ altındaki 🎙).
        </p>
      )}
    </Card>
  );
}
