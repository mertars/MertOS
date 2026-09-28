"use client";

import { useState } from "react";
import { Plus, Send, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import { Input } from "@/components/ui/input";
import { interpolateTemplate, SAMPLE_SUMMARY, TEMPLATE_VARIABLES } from "@/lib/notifications/templates";
import { CATEGORY_LABEL } from "@/lib/notifications/types";
import { useToastStore } from "@/lib/store/toast-store";
import { cn } from "@/lib/utils";
import type { NotificationCategory, NotificationCategorySettings, PersistenceLevel } from "@/lib/db/types";

const PERSISTENCE_OPTIONS: { value: PersistenceLevel; label: string }[] = [
  { value: "sakin", label: "Sakin" },
  { value: "normal", label: "Normal" },
  { value: "israrci", label: "Israrcı" },
];

export function CategorySettingsCard({
  category,
  settings,
  onChange,
  subscribed,
}: {
  category: NotificationCategory;
  settings: NotificationCategorySettings;
  onChange: (patch: Partial<NotificationCategorySettings>) => void;
  subscribed: boolean;
}) {
  const push = useToastStore((s) => s.push);
  const [newHour, setNewHour] = useState("09:00");
  const [focusedTemplate, setFocusedTemplate] = useState(0);
  const [testing, setTesting] = useState(false);

  function addHour() {
    if (settings.hours.includes(newHour)) return;
    onChange({ hours: [...settings.hours, newHour].sort() });
  }

  function removeHour(hour: string) {
    onChange({ hours: settings.hours.filter((h) => h !== hour) });
  }

  function addTemplate() {
    const next = [...settings.templates, ""];
    onChange({ templates: next });
    setFocusedTemplate(next.length - 1);
  }

  function updateTemplate(index: number, value: string) {
    onChange({ templates: settings.templates.map((t, i) => (i === index ? value : t)) });
  }

  function removeTemplate(index: number) {
    onChange({ templates: settings.templates.filter((_, i) => i !== index) });
  }

  function insertVariable(variable: string) {
    if (settings.templates.length === 0) return;
    const index = Math.min(focusedTemplate, settings.templates.length - 1);
    updateTemplate(index, `${settings.templates[index]}{${variable}}`);
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (res.ok) {
        push({ title: "Test bildirimi gönderildi", variant: "success" });
      } else {
        const err = await res.json().catch(() => ({}));
        push({ title: "Test bildirimi gönderilemedi", description: err.error, variant: "danger" });
      }
    } catch {
      push({ title: "Test bildirimi gönderilemedi", variant: "danger" });
    }
    setTesting(false);
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">{CATEGORY_LABEL[category]}</span>
        <Switch checked={settings.enabled} onCheckedChange={(v) => onChange({ enabled: v })} />
      </div>

      {settings.enabled && (
        <div className="space-y-4 mt-4">
          <div>
            <p className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">Israr düzeyi</p>
            <Segmented options={PERSISTENCE_OPTIONS} value={settings.persistence} onChange={(v: PersistenceLevel) => onChange({ persistence: v })} />
          </div>

          <div>
            <p className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">Saatler</p>
            <div className="flex flex-wrap gap-2">
              {settings.hours.map((h) => (
                <span key={h} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-card-raised)] border border-[var(--color-border)] pl-3 pr-1.5 py-1 text-[12.5px] tabular-nums-tight text-[var(--color-text-primary)]">
                  {h}
                  <button type="button" onClick={() => removeHour(h)} aria-label={`${h} saatini kaldır`} className="rounded-full p-0.5 hover:bg-white/10">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Input type="time" value={newHour} onChange={(e) => setNewHour(e.target.value)} className="w-28" />
              <Button size="sm" variant="secondary" onClick={addHour}>
                <Plus className="h-3.5 w-3.5" /> Ekle
              </Button>
            </div>
          </div>

          <div>
            <p className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">Mesaj şablonları</p>
            <div className="space-y-2">
              {settings.templates.map((t, i) => (
                <div key={i} className="rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-card-raised)] p-2.5">
                  <div className="flex items-start gap-2">
                    <textarea
                      value={t}
                      onFocus={() => setFocusedTemplate(i)}
                      onChange={(e) => updateTemplate(i, e.target.value)}
                      rows={2}
                      className="flex-1 resize-none bg-transparent text-[13.5px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
                      placeholder="Örn: {isim}, su hedefine {su_kalan} ml kaldı."
                    />
                    <button type="button" onClick={() => removeTemplate(i)} aria-label="Şablonu sil" className="rounded-full p-1 text-[var(--color-text-tertiary)] hover:bg-white/10 shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {t && <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-1.5 border-t border-[var(--color-border)] pt-1.5">{interpolateTemplate(t, SAMPLE_SUMMARY)}</p>}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  disabled={settings.templates.length === 0}
                  className={cn(
                    "rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]",
                    settings.templates.length === 0 ? "opacity-40" : "hover:bg-white/5",
                  )}
                >
                  {`{${v}}`}
                </button>
              ))}
            </div>
            <Button size="sm" variant="secondary" className="mt-2" onClick={addTemplate}>
              <Plus className="h-3.5 w-3.5" /> Şablon ekle
            </Button>
          </div>

          <Button size="sm" variant="secondary" className="w-full justify-center" disabled={!subscribed || testing} onClick={handleTest}>
            <Send className="h-3.5 w-3.5" /> {testing ? "Gönderiliyor…" : "Test bildirimi gönder"}
          </Button>
          {!subscribed && <p className="text-[11px] text-[var(--color-text-tertiary)] text-center">Test için önce bildirimleri aç.</p>}
        </div>
      )}
    </Card>
  );
}
