"use client";

import { useEffect, useState } from "react";
import { CloudDownload, LogOut, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { fetchAssistantSettings, logout, patchAssistantSettings } from "@/lib/assistant/client";
import type { AssistantSettings } from "@/lib/assistant/config";
import { useToastStore } from "@/lib/store/toast-store";

/** Ayarlar > Asistan: hitap (sunucuda, telefon ve Mac'te aynı), sunucu yedeği, çıkış. */
export function AssistantSettingsCard() {
  const [settings, setSettings] = useState<AssistantSettings | null>(null);
  const [error, setError] = useState<string>();
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    fetchAssistantSettings()
      .then(setSettings)
      .catch((e) => setError(e instanceof Error ? e.message : "Ayarlar okunamadı."));
  }, []);

  async function saveHitap(value: string) {
    const hitap = value.trim();
    if (!settings || !hitap || hitap === settings.hitap) return;
    try {
      setSettings(await patchAssistantSettings({ hitap }));
      push({ title: `Hitap: ${hitap}`, variant: "success" });
    } catch (e) {
      push({ title: "Kaydedilemedi", description: e instanceof Error ? e.message : undefined, variant: "danger" });
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2.5 mb-3">
        <MessageCircle className="h-4 w-4 text-[var(--color-text-secondary)]" />
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">Asistan</span>
      </div>
      {error && <p className="text-[12px] text-[var(--color-text-tertiary)] mb-3">{error}</p>}
      {settings && (
        <div className="mb-3">
          <Label htmlFor="hitap">Hitap</Label>
          <Input id="hitap" defaultValue={settings.hitap} onBlur={(e) => saveHitap(e.target.value)} />
        </div>
      )}
      <div className="space-y-2">
        <Button asChild variant="secondary" className="w-full justify-start">
          <a href="/api/backup/download" download>
            <CloudDownload className="h-4 w-4" /> Sunucu yedeğini indir
          </a>
        </Button>
        <Button variant="secondary" className="w-full justify-start" onClick={logout}>
          <LogOut className="h-4 w-4" /> Bu cihazda çıkış yap
        </Button>
      </div>
    </Card>
  );
}
