"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { differenceInDays } from "date-fns";
import { Download, Upload, Sparkles, Trash2, ShieldCheck, BellRing, ChevronRight, HeartPulse, Info, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { ModuleToggleList } from "@/components/settings/module-toggle-list";
import { PinSetupSheet } from "@/components/settings/pin-setup-sheet";
import { DangerZoneSheet } from "@/components/settings/danger-zone-sheet";
import { useProfile, useSettings } from "@/lib/hooks/db-hooks";
import { db, SINGLETON_IDS } from "@/lib/db";
import { disablePin } from "@/lib/pin/repo";
import { downloadBackupFile, exportAllData, importBackupFile } from "@/lib/backup/export-import";
import { loadDemoData } from "@/data/seed/demo";
import { useToastStore } from "@/lib/store/toast-store";
import type { ThemeMode } from "@/lib/db/types";

const APP_VERSION = "2.0.0 — 2. Aşama";

export default function AyarlarPage() {
  const profile = useProfile();
  const settings = useSettings();
  const push = useToastStore((s) => s.push);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pinSheetOpen, setPinSheetOpen] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  if (!profile || !settings) return null;

  async function saveProfile(patch: Partial<typeof profile>) {
    await db.profile.update(SINGLETON_IDS.PROFILE_ID, { ...patch, updatedAt: new Date().toISOString() });
  }

  async function handleExport() {
    const payload = await exportAllData();
    downloadBackupFile(payload);
    await db.settings.update(SINGLETON_IDS.SETTINGS_ID, { lastBackupAt: new Date().toISOString() });
    push({ title: "Yedek indirildi", variant: "success" });
  }

  async function handleImportFile(file: File) {
    try {
      await importBackupFile(file);
      push({ title: "Yedek içe aktarıldı", variant: "success" });
    } catch (e) {
      push({ title: "İçe aktarma başarısız", description: e instanceof Error ? e.message : undefined, variant: "danger" });
    }
  }

  async function handleDemoData() {
    setDemoLoading(true);
    await loadDemoData();
    setDemoLoading(false);
    push({ title: "Demo verisi yüklendi", variant: "success" });
  }

  const daysSinceBackup = settings.lastBackupAt ? differenceInDays(new Date(), new Date(settings.lastBackupAt)) : null;
  const needsBackupReminder = daysSinceBackup === null || daysSinceBackup >= 7;

  return (
    <>
      <PageHeader eyebrow="MertOS" title="Ayarlar" />
      <div className="px-5 mt-2 pb-8 space-y-5">
        <Card>
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">Profil</p>
          <div className="space-y-3">
            <div>
              <Label>İsim</Label>
              <Input defaultValue={profile.name} onBlur={(e) => saveProfile({ name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Boy (cm)</Label>
                <Input
                  type="number"
                  defaultValue={profile.heightCm ?? ""}
                  onBlur={(e) => saveProfile({ heightCm: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div>
                <Label>Kilo (kg)</Label>
                <Input
                  type="number"
                  defaultValue={profile.weightKg ?? ""}
                  onBlur={(e) => saveProfile({ weightKg: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>
            <div>
              <Label>Hedef kilo (kg)</Label>
              <Input
                type="number"
                defaultValue={profile.weightGoalKg ?? ""}
                onBlur={(e) => saveProfile({ weightGoalKg: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>
        </Card>

        <div>
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2 px-1">Modüller</p>
          <ModuleToggleList settings={settings} />
        </div>

        <Card>
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">Görünüm</p>
          <Label>Tema</Label>
          <Segmented
            options={[
              { value: "koyu", label: "Koyu" },
              { value: "acik", label: "Açık" },
              { value: "sistem", label: "Sistem" },
            ]}
            value={settings.theme}
            onChange={(v: ThemeMode) => db.settings.update(SINGLETON_IDS.SETTINGS_ID, { theme: v })}
          />
        </Card>

        <Card>
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">Skor Ağırlıkları</p>
          <div className="space-y-3">
            {(
              [
                { key: "hareket", label: "Hareket", accent: "--color-hareket" },
                { key: "yakit", label: "Yakıt", accent: "--color-su" },
                { key: "temiz", label: "Temiz", accent: "--color-sigara-temiz" },
                { key: "zihin", label: "Zihin", accent: "--color-zihin" },
              ] as const
            ).map((r) => (
              <div key={r.key} className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: `var(${r.accent})` }} />
                <span className="text-[13px] text-[var(--color-text-primary)] w-16">{r.label}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(settings.scoreWeights[r.key] * 100)}
                  onChange={(e) =>
                    db.settings.update(SINGLETON_IDS.SETTINGS_ID, {
                      scoreWeights: { ...settings.scoreWeights, [r.key]: Number(e.target.value) / 100 },
                    })
                  }
                  className="flex-1 accent-[var(--color-hareket)]"
                />
                <span className="text-[12px] tabular-nums-tight text-[var(--color-text-tertiary)] w-9 text-right">
                  {Math.round(settings.scoreWeights[r.key] * 100)}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Link href="/ayarlar/bildirimler">
          <Card className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BellRing className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <span className="text-[13.5px] font-medium text-[var(--color-text-primary)]">Bildirimler</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          </Card>
        </Link>

        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <span className="text-[13.5px] font-medium text-[var(--color-text-primary)]">PIN Kilidi</span>
            </div>
            <Switch
              checked={settings.pinEnabled}
              onCheckedChange={(v) => (v ? setPinSheetOpen(true) : disablePin())}
            />
          </div>
          {settings.pinEnabled && (
            <button onClick={() => setPinSheetOpen(true)} className="text-[12.5px] font-medium text-[var(--color-su)] mt-3">
              PIN&apos;i değiştir
            </button>
          )}
        </Card>

        <Card>
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-1">Veri</p>
          {needsBackupReminder && (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--color-warning)]/10 px-3 py-2 mt-2 mb-3">
              <AlertCircle className="h-3.5 w-3.5 text-[var(--color-warning)] shrink-0" />
              <p className="text-[11.5px] text-[var(--color-warning)]">
                {daysSinceBackup == null ? "Henüz yedek almadın." : `${daysSinceBackup} gündür yedek almadın.`}
              </p>
            </div>
          )}
          <div className="space-y-2 mt-2">
            <Button variant="secondary" className="w-full justify-start" onClick={handleExport}>
              <Download className="h-4 w-4" /> Dışa aktar (JSON)
            </Button>
            <Button variant="secondary" className="w-full justify-start" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> İçe aktar
            </Button>
            <Button asChild variant="secondary" className="w-full justify-start">
              <Link href="/import">
                <HeartPulse className="h-4 w-4" /> Apple Sağlık&apos;tan içe aktar
              </Link>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])}
            />
            <Button variant="secondary" className="w-full justify-start" disabled={demoLoading} onClick={handleDemoData}>
              <Sparkles className="h-4 w-4" /> {demoLoading ? "Yükleniyor…" : "Demo verisi yükle"}
            </Button>
            <Button variant="danger" className="w-full justify-start" onClick={() => setDangerOpen(true)}>
              <Trash2 className="h-4 w-4" /> Tüm veriyi sil
            </Button>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <Info className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          <div>
            <p className="text-[13px] font-medium text-[var(--color-text-primary)]">MertOS</p>
            <p className="text-[11.5px] text-[var(--color-text-tertiary)]">{APP_VERSION}</p>
          </div>
        </Card>
      </div>

      <PinSetupSheet open={pinSheetOpen} onOpenChange={setPinSheetOpen} />
      <DangerZoneSheet open={dangerOpen} onOpenChange={setDangerOpen} />
    </>
  );
}
