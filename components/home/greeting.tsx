"use client";

import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { getDailyMotivasyon } from "@/data/seed/motivasyon";
import { useProfile } from "@/lib/hooks/db-hooks";

function getGreeting(hour: number) {
  if (hour < 6) return "İyi geceler";
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

export function Greeting() {
  const profile = useProfile();
  const now = new Date();
  const name = profile?.name || "Mert";

  return (
    <div className="px-5 pt-safe mt-5">
      <p className="text-[26px] font-bold tracking-tight text-[var(--color-text-primary)]">
        {getGreeting(now.getHours())} {name}
      </p>
      <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5 capitalize">
        {format(now, "d MMMM EEEE", { locale: tr })}
      </p>
      <p className="text-[13px] text-[var(--color-text-tertiary)] mt-2 italic">{getDailyMotivasyon(now)}</p>
    </div>
  );
}
