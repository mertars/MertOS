"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, FolderKanban, ListChecks, Timer } from "lucide-react";
import { SectionTitle } from "@/components/fx/bits";
import { ProjectsCard } from "@/components/fx/desktop-home";
import { CardLabel, GlassCard } from "@/components/fx/glass-card";
import { fetchTodos } from "@/lib/assistant/client";
import { addDays, istanbulNow } from "@/lib/assistant/time";
import { formatTrDate } from "@/lib/assistant/text";
import type { TodoItem } from "@/lib/assistant/types";
import { cn } from "@/lib/utils";

// Projeler sekmesi (Faz 3): GitHub proje okuyucu Faz 5'te. Şimdilik yaklaşan
// yapılacaklar (7 gün) ve eski üretkenlik modüllerine bağlantılar.

const LINKS = [
  { href: "/hublar/uretkenlik/projeler", label: "Projeler", note: "eski proje listesi", icon: FolderKanban },
  { href: "/hublar/uretkenlik/gorevler", label: "Görevler", note: "uzun vadeli", icon: ListChecks },
  { href: "/hublar/uretkenlik/odak", label: "Odak", note: "zamanlayıcı", icon: Timer },
  { href: "/hublar/takvim/cizelge", label: "Takvim", note: "çizelge", icon: CalendarClock },
];

export default function ProjelerPage() {
  const [todos, setTodos] = useState<TodoItem[] | null>(null);
  useEffect(() => {
    const today = istanbulNow().date;
    fetchTodos(today, addDays(today, 7))
      .then((r) => setTodos(r.todos))
      .catch(() => setTodos([]));
  }, []);
  const today = istanbulNow().date;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-10 lg:px-7">
      <SectionTitle eyebrow="Projeler · Faz 5'te GitHub" title="Projeler" />
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr] lg:gap-4">
        <GlassCard accent="--fx-proje" index={1}>
          <CardLabel>Yaklaşan · 7 gün</CardLabel>
          {todos === null && <div className="mt-3 h-16 animate-pulse rounded-[12px] bg-white/[0.04]" />}
          {todos?.length === 0 && <p className="mt-2 text-[13px] text-[var(--fx-text-3)]">Önümüzdeki 7 gün için yapılacak yok.</p>}
          <ul className="mt-2 space-y-2">
            {todos?.map((t) => (
              <li key={t.id} className="flex items-baseline gap-3">
                <span className="fx-num w-[86px] shrink-0 text-[10.5px] text-[var(--fx-text-3)]">
                  {t.date === today ? "BUGÜN" : formatTrDate(t.date).toLocaleUpperCase("tr-TR")} {t.time ?? ""}
                </span>
                <span className={cn("min-w-0 flex-1 text-[14px]", t.done && "text-[var(--fx-text-3)] line-through")}>{t.title}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
        <ProjectsCard index={2} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:mt-4 lg:grid-cols-4 lg:gap-4">
        {LINKS.map((l, i) => {
          const Icon = l.icon;
          return (
            <Link key={l.href} href={l.href}>
              <GlassCard accent="--fx-proje" index={i + 3} className="h-full">
                <Icon className="h-5 w-5 text-[var(--fx-proje)]" />
                <CardLabel className="mt-3">{l.label}</CardLabel>
                <p className="text-[12px] text-[var(--fx-text-3)]">{l.note}</p>
              </GlassCard>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
