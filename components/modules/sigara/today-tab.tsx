"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import {
  addCigaretteEntry,
  getCigaretteEntriesForDay,
  getLastCigaretteEntry,
  restoreCigaretteEntry,
  softDeleteCigaretteEntry,
} from "@/lib/db/repo/cigarette";
import { getWorkoutsForDate } from "@/lib/db/repo/workouts";
import { useCigaretteSettings } from "@/lib/hooks/db-hooks";
import { computeCigaretteLimit } from "@/lib/scoring/engine";
import { isWithinTrainingProtectionWindow } from "@/lib/cigarette/protection";
import { TRIGGER_LABELS, TRIGGER_LIST } from "@/lib/cigarette/triggers";
import { showUndoToast } from "@/lib/store/toast-store";
import type { CigaretteTrigger } from "@/lib/db/types";

function formatElapsed(ms: number) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} dk`;
  return `${h} sa ${m} dk`;
}

export function TodayTab() {
  const settings = useCigaretteSettings();
  const entries = useLiveQuery(() => getCigaretteEntriesForDay(), []);
  const last = useLiveQuery(() => getLastCigaretteEntry(), []);
  const todaysWorkouts = useLiveQuery(() => getWorkoutsForDate(), []);
  const [now, setNow] = useState(() => Date.now());
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!settings) return null;

  const limit = computeCigaretteLimit(settings, new Date());
  const todayCount = entries?.length ?? 0;
  const inProtection =
    settings.trainingProtectionEnabled && todaysWorkouts
      ? isWithinTrainingProtectionWindow(new Date(now), todaysWorkouts, settings.trainingProtectionWindowMin)
      : false;

  async function logCigarette(trigger?: CigaretteTrigger) {
    const id = await addCigaretteEntry(trigger);
    setPickerOpen(false);
    showUndoToast("Sigara kaydedildi", () => softDeleteCigaretteEntry(id));
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col items-center gap-4 py-6">
        {last ? (
          <div className="text-center">
            <p className="text-[13px] text-[var(--color-text-secondary)]">Son sigaradan beri</p>
            <p className="text-3xl font-bold tabular-nums-tight text-[var(--color-text-primary)] mt-1">
              {formatElapsed(now - new Date(last.at).getTime())}
            </p>
          </div>
        ) : (
          <p className="text-[17px] font-semibold text-[var(--color-sigara-temiz)]">Bugün hiç sigara yok 🎉</p>
        )}

        <p className="text-[13px] text-[var(--color-text-secondary)]">
          Bugün <span className="font-semibold text-[var(--color-text-primary)]">{todayCount}</span> /{" "}
          {settings.quitMode ? 0 : limit} limit
        </p>

        {inProtection && (
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--color-sigara-temiz)]/12 px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-sigara-temiz)]" />
            <span className="text-[11.5px] font-medium text-[var(--color-sigara-temiz)]">
              Antrenman koruması aktif — temiz pencerede
            </span>
          </div>
        )}

        <Button variant="accent" accentVar="--color-sigara" onClick={() => setPickerOpen(true)} className="w-full">
          Sigara Ekle
        </Button>
      </Card>

      <Card>
        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-1">Bugünkü kayıtlar</p>
        {entries && entries.length > 0 ? (
          entries
            .slice()
            .reverse()
            .map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2.5 border-b border-[var(--color-border)] last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] tabular-nums-tight text-[var(--color-text-secondary)] w-12">
                    {format(new Date(e.at), "HH:mm")}
                  </span>
                  <span className="text-[13px] text-[var(--color-text-primary)]">
                    {e.trigger ? TRIGGER_LABELS[e.trigger] : "Tetikleyici yok"}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    await softDeleteCigaretteEntry(e.id);
                    showUndoToast("Kayıt silindi", () => restoreCigaretteEntry(e.id));
                  }}
                  className="p-2 -m-2 text-[var(--color-text-tertiary)]"
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
        ) : (
          <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="Bugün hiç kayıt yok" />
        )}
      </Card>

      <Sheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Tetikleyici"
        description="İstersen seç, istemezsen tetikleyicisiz kaydet."
      >
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {TRIGGER_LIST.map((t) => (
            <button
              key={t}
              onClick={() => logCigarette(t)}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-raised)] py-3 text-[13px] font-medium text-[var(--color-text-primary)] active:scale-95 transition-transform min-h-11"
            >
              {TRIGGER_LABELS[t]}
            </button>
          ))}
        </div>
        <Button variant="secondary" className="w-full mt-3" onClick={() => logCigarette(undefined)}>
          Tetikleyicisiz kaydet
        </Button>
      </Sheet>
    </div>
  );
}
