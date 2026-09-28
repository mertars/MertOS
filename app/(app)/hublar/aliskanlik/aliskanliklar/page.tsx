"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { subWeeks } from "date-fns";
import { Check, Flame, Plus, Repeat } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { HeatmapGrid } from "@/components/ui/heatmap-grid";
import { addHabit, getActiveHabits, getAllHabitLogsForDate, getHabitLogsInRange, getHabitStreak, toggleHabitLog } from "@/lib/db/repo/aliskanlik";
import type { Habit } from "@/lib/db/types";

const COLORS = ["--color-uyku", "--color-hareket", "--color-su", "--color-zihin", "--color-finans"];

export default function AliskanliklarPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [colorVar, setColorVar] = useState(COLORS[0]);

  const habits = useLiveQuery(() => getActiveHabits(), []);
  const todayLogs = useLiveQuery(() => getAllHabitLogsForDate(), []);
  const doneHabitIds = new Set((todayLogs ?? []).map((l) => l.habitId));

  async function handleAdd() {
    if (!name.trim()) return;
    await addHabit(name.trim(), colorVar, { type: "gunluk" });
    setName("");
    setSheetOpen(false);
  }

  return (
    <>
      <PageHeader eyebrow="Alışkanlık & Hedef" title="Alışkanlıklar" />
      <div className="px-5 mt-2 space-y-3 pb-4">
        {habits && habits.length > 0 ? (
          habits.map((h) => <HabitCard key={h.id} habit={h} done={doneHabitIds.has(h.id)} />)
        ) : (
          <EmptyState icon={<Repeat className="h-6 w-6" />} title="Henüz alışkanlık yok" description="Takip etmek istediğin bir alışkanlık ekle." />
        )}

        <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Alışkanlık Ekle
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Alışkanlık Ekle">
        <div className="space-y-4">
          <div>
            <Label>Ad</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Sabah 5 dk esneme" />
          </div>
          <div>
            <Label>Renk</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColorVar(c)}
                  className="h-9 w-9 rounded-full border-2"
                  style={{ backgroundColor: `var(${c})`, borderColor: colorVar === c ? "white" : "transparent" }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <Button variant="accent" accentVar="--color-uyku" className="w-full" onClick={handleAdd}>
            Ekle
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function HabitCard({ habit, done }: { habit: Habit; done: boolean }) {
  const streak = useLiveQuery(() => getHabitStreak(habit.id), [habit.id, done]);
  const logs = useLiveQuery(async () => {
    const rows = await getHabitLogsInRange(habit.id, subWeeks(new Date(), 10), new Date());
    return new Set(rows.map((r) => r.date));
  }, [habit.id, done]);

  return (
    <Card>
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => toggleHabitLog(habit.id, new Date(), !done)}
          className="flex h-9 w-9 items-center justify-center rounded-full border shrink-0 transition-colors"
          style={{ backgroundColor: done ? `var(${habit.colorVar})` : "transparent", borderColor: done ? `var(${habit.colorVar})` : "var(--color-border-strong)" }}
          aria-label={done ? "Bugün için kaldır" : "Bugün için işaretle"}
        >
          {done && <Check className="h-4 w-4 text-black" />}
        </button>
        <p className="flex-1 text-[14px] font-semibold text-[var(--color-text-primary)]">{habit.name}</p>
        {streak != null && streak > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <Flame className="h-3.5 w-3.5 text-[var(--color-warning)]" fill="var(--color-warning)" />
            <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{streak}</span>
          </div>
        )}
      </div>
      {logs && <HeatmapGrid doneDates={logs} colorVar={habit.colorVar} />}
    </Card>
  );
}
