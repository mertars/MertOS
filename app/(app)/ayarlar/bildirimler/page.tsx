"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { PushStatusCard } from "@/components/settings/notifications/push-status-card";
import { CategorySettingsCard } from "@/components/settings/notifications/category-settings-card";
import { useNotificationSettings } from "@/lib/hooks/db-hooks";
import { updateNotificationSettings } from "@/lib/db";
import { hasActivePushSubscription, subscribeToPush } from "@/lib/notifications/subscribe";
import { ALL_CATEGORIES } from "@/lib/notifications/types";
import type { NotificationCategory, NotificationCategorySettings } from "@/lib/db/types";

export default function BildirimlerPage() {
  const settings = useNotificationSettings();
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    hasActivePushSubscription().then(setSubscribed);
  }, []);

  if (!settings) return null;

  async function handleCategoryChange(category: NotificationCategory, patch: Partial<NotificationCategorySettings>) {
    if (!settings) return;
    const nextCategories = { ...settings.categories, [category]: { ...settings.categories[category], ...patch } };
    await updateNotificationSettings({ categories: nextCategories });
    if (subscribed) {
      await subscribeToPush(settings.quietHoursStart, settings.quietHoursEnd, nextCategories);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Ayarlar" title="Bildirimler" />
      <div className="px-5 mt-2 pb-8 space-y-4">
        <Card>
          <div className="flex items-center gap-2.5 mb-3">
            <Sparkles className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <span className="text-[13.5px] font-medium text-[var(--color-text-primary)]">AI Koç</span>
          </div>
          <Label>Günlük istek limiti</Label>
          <Input
            type="number"
            min={1}
            max={200}
            defaultValue={settings.dailyCoachRequestLimit}
            onBlur={(e) => updateNotificationSettings({ dailyCoachRequestLimit: e.target.value ? Number(e.target.value) : settings.dailyCoachRequestLimit })}
            className="w-24"
          />
        </Card>

        <PushStatusCard settings={settings} subscribed={subscribed} onSubscribedChange={setSubscribed} />
        {ALL_CATEGORIES.map((category) => (
          <CategorySettingsCard
            key={category}
            category={category}
            settings={settings.categories[category]}
            subscribed={subscribed}
            onChange={(patch) => handleCategoryChange(category, patch)}
          />
        ))}
      </div>
    </>
  );
}
