"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Sparkles, Sunrise, CalendarRange, Dumbbell, Send } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CoachMessageBubble } from "@/components/modules/koc/coach-message-bubble";
import { addCoachMessage, getAllCoachMessages, getTodayCoachRequestCount, hasGeneratedThisWeek, hasGeneratedToday } from "@/lib/db/repo/coach";
import { buildCoachContext } from "@/lib/coach/context";
import { computeCurrentStreak, computeScoreForDate } from "@/lib/hooks/use-mertos-score";
import { useNotificationSettings } from "@/lib/hooks/db-hooks";
import { useToastStore } from "@/lib/store/toast-store";
import type { CoachRequestKind } from "@/lib/db/types";
import { cn } from "@/lib/utils";

const RANGE_DAYS: Record<CoachRequestKind, number> = { brifing: 7, haftalik_rapor: 7, program_onerisi: 30, sohbet: 14 };

export default function KocPage() {
  const messages = useLiveQuery(() => getAllCoachMessages(), []);
  const todayCount = useLiveQuery(() => getTodayCoachRequestCount(), [messages]);
  const brifingDoneToday = useLiveQuery(() => hasGeneratedToday("brifing"), [messages]);
  const weeklyDoneThisWeek = useLiveQuery(() => hasGeneratedThisWeek("haftalik_rapor"), [messages]);
  const notificationSettings = useNotificationSettings();
  const push = useToastStore((s) => s.push);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages?.length]);

  const dailyLimit = notificationSettings?.dailyCoachRequestLimit ?? 20;
  const limitReached = (todayCount ?? 0) >= dailyLimit;

  async function send(kind: CoachRequestKind, userText?: string) {
    if (limitReached) {
      push({ title: "Günlük Koç limitine ulaştın", description: "Ayarlar'dan limiti artırabilirsin.", variant: "danger" });
      return;
    }
    setSending(true);
    if (kind === "sohbet" && userText) {
      await addCoachMessage("user", userText);
      setInput("");
    }
    try {
      const today = new Date();
      const todayScore = await computeScoreForDate(today);
      const streak = await computeCurrentStreak(today, todayScore);
      const context = await buildCoachContext(RANGE_DAYS[kind], streak);
      const allMessages = await getAllCoachMessages();
      const history = allMessages
        .filter((m) => !m.kind || m.kind === "sohbet")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, context, message: kind === "sohbet" ? userText : undefined, history: kind === "sohbet" ? history.slice(0, -1) : undefined }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        push({ title: "Koç'a ulaşılamadı", description: err.error ?? "İnternet bağlantını kontrol et.", variant: "danger" });
        return;
      }
      const { reply } = await res.json();
      await addCoachMessage("assistant", reply, kind === "sohbet" ? undefined : kind);
    } catch {
      push({ title: "Koç'a ulaşılamadı", description: "İnternet bağlantını kontrol et.", variant: "danger" });
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    send("sohbet", text);
  }

  return (
    <>
      <PageHeader eyebrow="MertOS" title="Koç" />
      <div className="px-5 mt-2 pb-40 space-y-3">
        {!messages ? null : messages.length === 0 ? (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Henüz sohbet yok" description="Aşağıdaki hızlı aksiyonlardan birini dene ya da doğrudan yaz." />
        ) : (
          <>
            {messages.map((m) => (
              <CoachMessageBubble key={m.id} message={m} />
            ))}
            <div ref={scrollRef} />
          </>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-28 z-20 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-xl px-5 py-3 space-y-2.5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button size="sm" variant="secondary" disabled={sending || limitReached || brifingDoneToday} onClick={() => send("brifing")} className="shrink-0">
            <Sunrise className="h-3.5 w-3.5" /> Sabah Brifingi
          </Button>
          <Button size="sm" variant="secondary" disabled={sending || limitReached || weeklyDoneThisWeek} onClick={() => send("haftalik_rapor")} className="shrink-0">
            <CalendarRange className="h-3.5 w-3.5" /> Haftalık Rapor
          </Button>
          <Button size="sm" variant="secondary" disabled={sending || limitReached} onClick={() => send("program_onerisi")} className="shrink-0">
            <Dumbbell className="h-3.5 w-3.5" /> Program Öner
          </Button>
        </div>
        {limitReached && <p className="text-[11.5px] text-[var(--color-warning)]">Günlük Koç limitine ulaştın ({dailyLimit}) — yarın devam edebilirsin.</p>}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Koç'a bir şey sor…"
            disabled={sending || limitReached}
            className="flex-1 h-11 rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-card-raised)] px-3.5 text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-white/30 disabled:opacity-50"
          />
          <Button type="submit" size="icon" disabled={sending || limitReached || !input.trim()} className={cn(sending && "opacity-60")}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  );
}
