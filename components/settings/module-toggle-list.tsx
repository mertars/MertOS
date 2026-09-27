"use client";

import { HUBS, getConfigurableModules } from "@/lib/registry/modules";
import { Switch } from "@/components/ui/switch";
import { db, SINGLETON_IDS } from "@/lib/db";
import type { AppSettings } from "@/lib/db/types";

export function ModuleToggleList({ settings }: { settings: AppSettings }) {
  const modules = getConfigurableModules();

  async function toggle(moduleId: string, value: boolean) {
    await db.settings.update(SINGLETON_IDS.SETTINGS_ID, {
      moduleToggles: { ...settings.moduleToggles, [moduleId]: value },
    });
  }

  return (
    <div className="space-y-4">
      {HUBS.map((hub) => {
        const hubModules = modules.filter((m) => m.hubId === hub.id);
        if (hubModules.length === 0) return null;
        return (
          <div key={hub.id}>
            <p className="text-[12px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1.5 px-1">{hub.name}</p>
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
              {hubModules.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13.5px] font-medium text-[var(--color-text-primary)]">{m.name}</span>
                  <Switch
                    checked={settings.moduleToggles[m.id] ?? m.enabledByDefault}
                    onCheckedChange={(v) => toggle(m.id, v)}
                    accentVar={m.accentVar}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
