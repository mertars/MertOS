"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input, Label } from "@/components/ui/input";
import { getPushPermissionState, subscribeToPush, unsubscribeFromPush } from "@/lib/notifications/subscribe";
import { updateNotificationSettings } from "@/lib/db";
import { useToastStore } from "@/lib/store/toast-store";
import type { NotificationSettings } from "@/lib/db/types";

export function PushStatusCard({
  settings,
  subscribed,
  onSubscribedChange,
}: {
  settings: NotificationSettings;
  subscribed: boolean;
  onSubscribedChange: (subscribed: boolean) => void;
}) {
  const push = useToastStore((s) => s.push);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushPermissionState().then(setPermission);
  }, []);

  async function handleToggle(next: boolean) {
    setBusy(true);
    if (next) {
      const result = await subscribeToPush(settings.quietHoursStart, settings.quietHoursEnd, settings.categories);
      if (result.ok) {
        onSubscribedChange(true);
        push({ title: "Bildirimler açıldı", variant: "success" });
      } else {
        push({ title: "Bildirimler açılamadı", description: result.error, variant: "danger" });
      }
    } else {
      await unsubscribeFromPush();
      onSubscribedChange(false);
      push({ title: "Bildirimler kapatıldı" });
    }
    setPermission(await getPushPermissionState());
    setBusy(false);
  }

  async function handleQuietHoursChange(patch: Partial<Pick<NotificationSettings, "quietHoursStart" | "quietHoursEnd">>) {
    await updateNotificationSettings(patch);
    if (subscribed) {
      const next = { ...settings, ...patch };
      await subscribeToPush(next.quietHoursStart, next.quietHoursEnd, next.categories);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BellRing className="h-4 w-4 text-[var(--color-text-secondary)]" />
          <span className="text-[13.5px] font-medium text-[var(--color-text-primary)]">Bildirimler</span>
        </div>
        <Switch checked={subscribed} disabled={busy} onCheckedChange={handleToggle} />
      </div>
      {permission === "denied" && (
        <p className="text-[11.5px] text-[var(--color-warning)] mt-2">
          Tarayıcı bildirim izni reddedilmiş — açmak için cihaz/tarayıcı ayarlarından izin vermen gerekiyor.
        </p>
      )}
      {permission === "unsupported" && (
        <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-2">Bu tarayıcı push bildirimlerini desteklemiyor.</p>
      )}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <Label>Sessiz saat başlangıcı</Label>
          <Input type="time" value={settings.quietHoursStart} onChange={(e) => handleQuietHoursChange({ quietHoursStart: e.target.value })} />
        </div>
        <div>
          <Label>Sessiz saat bitişi</Label>
          <Input type="time" value={settings.quietHoursEnd} onChange={(e) => handleQuietHoursChange({ quietHoursEnd: e.target.value })} />
        </div>
      </div>
    </Card>
  );
}
