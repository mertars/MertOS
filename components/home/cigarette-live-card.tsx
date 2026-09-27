"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Cigarette } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getLastCigaretteEntry, getCigaretteEntriesForDay } from "@/lib/db/repo/cigarette";
import { useCigaretteSettings } from "@/lib/hooks/db-hooks";
import { computeCigaretteLimit } from "@/lib/scoring/engine";

function formatElapsed(ms: number) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} dk`;
  return `${h} sa ${m} dk`;
}

export function CigaretteLiveCard() {
  const settings = useCigaretteSettings();
  const last = useLiveQuery(() => getLastCigaretteEntry(), []);
  const todayCount = useLiveQuery(async () => (await getCigaretteEntriesForDay()).length, []) ?? 0;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!settings) return null;
  const limit = computeCigaretteLimit(settings, new Date());

  return (
    <Link href="/hublar/sigara/takip" className="block px-5">
      <Card className="flex items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-sigara)]/15">
          <Cigarette className="h-5 w-5 text-[var(--color-sigara)]" />
        </span>
        <div className="min-w-0 flex-1">
          {last ? (
            <p className="text-[15px] font-semibold text-[var(--color-text-primary)] tabular-nums-tight">
              Son sigaradan beri {formatElapsed(now - new Date(last.at).getTime())}
            </p>
          ) : (
            <p className="text-[15px] font-semibold text-[var(--color-sigara-temiz)]">Bugün hiç sigara yok 🎉</p>
          )}
          <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5">
            Bugün {todayCount} / {settings.quitMode ? 0 : limit} limit
          </p>
        </div>
      </Card>
    </Link>
  );
}
