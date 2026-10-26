"use client";

import { Palette } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { cacheBackground, cacheEffect, useBackgroundChoice, useEffectLevel } from "@/components/fx/effect-level";
import { patchAssistantSettings } from "@/lib/assistant/client";
import type { BackgroundChoice, EffectLevel } from "@/lib/assistant/config";
import { useToastStore } from "@/lib/store/toast-store";

/**
 * Ayarlar > Görünüm (Faz 3): efekt seviyesi (Tam/Orta/Düşük/Kapalı) ve arka plan
 * (Dalga/Toz). Seçim telefonda anında uygulanır (önbellek), sonra sunucuya yazılır
 * ki Mac'te de aynı olsun. Sistemin "hareketi azalt" ayarı açıksa en fazla Düşük uygulanır.
 */
export function AppearanceCard() {
  const level = useEffectLevel();
  const background = useBackgroundChoice();
  const push = useToastStore((s) => s.push);

  async function save(patch: { efekt?: EffectLevel; arka?: BackgroundChoice }) {
    if (patch.efekt) cacheEffect(patch.efekt);
    if (patch.arka) cacheBackground(patch.arka);
    try {
      await patchAssistantSettings(patch);
    } catch (e) {
      push({ title: "Sunucuya kaydedilemedi", description: e instanceof Error ? e.message : undefined, variant: "danger" });
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2.5 mb-3">
        <Palette className="h-4 w-4 text-[var(--color-text-secondary)]" />
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">Görünüm</span>
      </div>
      <p className="mb-1.5 text-[12px] text-[var(--color-text-secondary)]">Efektler</p>
      <Segmented<EffectLevel>
        value={level}
        onChange={(efekt) => save({ efekt })}
        options={[
          { value: "tam", label: "Tam" },
          { value: "orta", label: "Orta" },
          { value: "dusuk", label: "Düşük" },
          { value: "kapali", label: "Kapalı" },
        ]}
      />
      <p className="mt-1.5 text-[11.5px] leading-snug text-[var(--color-text-tertiary)]">
        Orta: daha az ve yavaş hareket. Düşük: arka plan neredeyse sabit, bulanıklık azalır. Kapalı: düz parlak siyah, animasyon yok.
      </p>
      <p className="mb-1.5 mt-4 text-[12px] text-[var(--color-text-secondary)]">Arka plan</p>
      <Segmented<BackgroundChoice>
        value={background}
        onChange={(arka) => save({ arka })}
        options={[
          { value: "dalga", label: "Dalga" },
          { value: "toz", label: "Işık ve toz" },
        ]}
      />
    </Card>
  );
}
