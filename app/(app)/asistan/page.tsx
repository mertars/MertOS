"use client";

import { useEffect, useRef, useState } from "react";
import { BookmarkPlus, CheckCircle2, CloudOff, MessageCirclePlus, RotateCcw, Send, X } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import {
  deleteMemoryNote,
  endChat,
  endChatBeacon,
  fetchChat,
  sendChat,
  storeConversationId,
  storedConversationId,
  undoChatMark,
  type ClientChatMessage,
} from "@/lib/assistant/client";
import { useToastStore } from "@/lib/store/toast-store";
import { cn } from "@/lib/utils";

// Asistan — yazılı sohbet (Faz 2). Ses ve proaktif konuşma Faz 4'te, yeni
// tasarım Faz 3'te. Sohbet veri değiştirmez; yalnızca hafıza notu çıkarır
// ("Not aldım: …" satırı — yanındaki ✕ ile hemen silinebilir) ve Mert "koştum"
// deyince rutini işaretler ("İşaretledim: …" satırı — "Geri al" ile geri alınır).

export default function AsistanPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ClientChatMessage[] | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(true);
  const push = useToastStore((s) => s.push);
  const bottomRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<string | null>(null);

  useEffect(() => {
    fetchChat(storedConversationId())
      .then((r) => {
        setConversationId(r.conversationId);
        conversationRef.current = r.conversationId;
        storeConversationId(r.conversationId);
        setMessages(r.messages);
      })
      .catch(() => setMessages([]));

    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    // Sayfadan çıkınca sohbetten hafıza çıkar (cevap beklenmez).
    const onHide = () => document.visibilityState === "hidden" && conversationRef.current && endChatBeacon(conversationRef.current);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      document.removeEventListener("visibilitychange", onHide);
      if (conversationRef.current) endChatBeacon(conversationRef.current);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages?.length, sending]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    const optimistic: ClientChatMessage = { id: -Date.now(), conversationId: conversationId ?? "", role: "user", content: text, createdAt: new Date().toISOString(), meta: null };
    setMessages((m) => [...(m ?? []), optimistic]);
    try {
      const r = await sendChat(conversationId, text);
      const fresh = r.marks ? [r.userMessage, r.marks, r.reply] : [r.userMessage, r.reply];
      if (r.conversationId !== conversationId) {
        // Yeni sohbet açıldı (ilk mesaj ya da 6 saatlik sessizlik): ekranda yalnızca yenisi.
        setMessages(fresh);
      } else {
        setMessages((m) => [...(m ?? []).filter((x) => x.id !== optimistic.id), ...fresh]);
      }
      setConversationId(r.conversationId);
      conversationRef.current = r.conversationId;
      storeConversationId(r.conversationId);
    } catch (err) {
      setMessages((m) => (m ?? []).filter((x) => x.id !== optimistic.id));
      setInput(text);
      push({ title: "Gönderilemedi", description: err instanceof Error ? err.message : undefined, variant: "danger" });
    } finally {
      setSending(false);
    }
  }

  async function newConversation() {
    const old = conversationId;
    setConversationId(null);
    conversationRef.current = null;
    storeConversationId(null);
    setMessages([]);
    if (!old) return;
    try {
      const { notes } = await endChat(old);
      if (notes.length) push({ title: `${notes.length} not aldım`, description: notes.map((n) => n.text).join(" · "), variant: "success" });
    } catch {
      // hafıza çıkarma bir sonraki sefere kalır
    }
  }

  async function removeNote(m: ClientChatMessage) {
    if (!m.meta?.memoryId) return;
    try {
      await deleteMemoryNote(m.meta.memoryId);
      setMessages((list) => (list ?? []).map((x) => (x.id === m.id ? { ...x, content: "Not silindi.", meta: null } : x)));
    } catch (err) {
      push({ title: "Silinemedi", description: err instanceof Error ? err.message : undefined, variant: "danger" });
    }
  }

  async function undoMark(m: ClientChatMessage) {
    try {
      const { message } = await undoChatMark(m.id);
      setMessages((list) => (list ?? []).map((x) => (x.id === m.id ? message : x)));
    } catch (err) {
      push({ title: "Geri alınamadı", description: err instanceof Error ? err.message : undefined, variant: "danger" });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="MertOS"
        title="Asistan"
        right={
          <button
            onClick={newConversation}
            aria-label="Yeni sohbet"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-card-raised)] border border-[var(--color-border-strong)] text-[var(--color-text-secondary)]"
          >
            <MessageCirclePlus className="h-4.5 w-4.5" />
          </button>
        }
      />
      <div className="px-5 mt-2 pb-44 space-y-2.5">
        {messages && messages.length === 0 && (
          <p className="pt-10 text-center text-[13px] text-[var(--color-text-tertiary)]">Bir şey yaz: “Elimde yumurta ve ıspanak var”, “Dün ne yedim?”…</p>
        )}
        {messages?.map((m) =>
          m.role === "not" ? (
            <div key={m.id} className="flex items-center justify-center gap-1.5 text-[11.5px] text-[var(--color-text-tertiary)]">
              {m.meta?.routine ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-success)]" />
              ) : m.meta?.routineUndone ? (
                <RotateCcw className="h-3.5 w-3.5" />
              ) : (
                <BookmarkPlus className="h-3.5 w-3.5 text-[var(--color-zihin)]" />
              )}
              <span>{m.content}</span>
              {m.meta?.routine && (
                <button onClick={() => undoMark(m)} className="h-8 px-2 font-medium text-[var(--color-text-secondary)] underline underline-offset-2">
                  Geri al
                </button>
              )}
              {m.meta?.memoryId && (
                <button onClick={() => removeNote(m)} aria-label="Notu sil" className="flex h-8 w-8 items-center justify-center">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-[18px] px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-[var(--color-text-primary)] text-[var(--color-bg)]"
                    : "bg-[var(--color-card-raised)] border border-[var(--color-border)] text-[var(--color-text-primary)]",
                  m.meta?.system && "text-[var(--color-warning)]",
                )}
              >
                {m.content}
              </div>
            </div>
          ),
        )}
        {sending && <div className="h-9 w-16 animate-pulse rounded-[18px] bg-[var(--color-card-raised)]" />}
        <div ref={bottomRef} />
      </div>

      <div className="fixed inset-x-0 bottom-28 z-20 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-xl px-5 py-3">
        {!online ? (
          <p className="flex items-center gap-2 text-[12.5px] text-[var(--color-text-secondary)]">
            <CloudOff className="h-4 w-4" /> İnternet yok — sohbet kapalı. Bugün ekranında son özet duruyor.
          </p>
        ) : (
          <form onSubmit={submit} className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Asistana yaz…"
              maxLength={2000}
              disabled={sending}
              className="flex-1 h-11 rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-card-raised)] px-3.5 text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-white/30 disabled:opacity-50"
            />
            <Button type="submit" size="icon" disabled={sending || !input.trim()} aria-label="Gönder">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        )}
      </div>
    </>
  );
}
