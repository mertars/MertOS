"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatItem } from "@/components/fx/chat-view";
import { useToastStore } from "@/lib/store/toast-store";
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
} from "./client";
import type { ChatMode } from "./persona";
import { TR_MONTHS } from "./text";

// Sohbetin istemci durumu (Faz 2 mantığı, Faz 3 görünümü): son sohbeti yükler,
// sayfadan çıkınca hafıza çıkarımını tetikler (sendBeacon), "Yeni sohbet"te
// notları toast ile gösterir; mesajları ChatList öğelerine çevirir.

const TZ = "Europe/Istanbul";
const timeFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

function dayLabel(date: string, today: string, yesterday: string): string {
  const [, m, d] = date.split("-").map(Number);
  const text = `${d} ${TR_MONTHS[m - 1].toLocaleUpperCase("tr-TR")}`;
  if (date === today) return `BUGÜN · ${text}`;
  if (date === yesterday) return `DÜN · ${text}`;
  return text;
}

/** "İşaretledim: Koşu" → başlık + ayrıntı */
function splitLine(content: string): { title: string; detail: string } {
  const i = content.indexOf(": ");
  return i < 0 ? { title: content, detail: "" } : { title: content.slice(0, i), detail: content.slice(i + 2) };
}

export function toChatItems(messages: ClientChatMessage[], now = new Date()): ChatItem[] {
  const today = dateFmt.format(now);
  const yesterday = dateFmt.format(new Date(now.getTime() - 86_400_000));
  const out: ChatItem[] = [];
  let lastDay = "";
  for (const m of messages) {
    const at = new Date(m.createdAt);
    const day = dateFmt.format(at);
    if (day !== lastDay) {
      out.push({ kind: "gun", key: `gun-${day}`, text: dayLabel(day, today, yesterday) });
      lastDay = day;
    }
    const key = String(m.id);
    if (m.role === "user") out.push({ kind: "mert", key, text: m.content, time: timeFmt.format(at) });
    else if (m.role === "assistant") out.push({ kind: "asistan", key, text: m.content, time: timeFmt.format(at), warn: Boolean(m.meta?.system) });
    else {
      const { title, detail } = splitLine(m.content);
      const meta = m.meta;
      if (meta?.routine || meta?.mealLogId || meta?.studyBlockId) out.push({ kind: "islem", key, id: m.id, type: "isaret", title, detail });
      else if (meta?.todoId) out.push({ kind: "islem", key, id: m.id, type: "liste", title, detail });
      else if (meta?.memoryId) out.push({ kind: "islem", key, id: m.id, type: "not", title, detail });
      else {
        const type = m.content.startsWith("Listeden") ? "liste" : m.content.startsWith("İşaretleme") ? "isaret" : "not";
        out.push({ kind: "islem", key, id: m.id, type, title, detail, undone: true });
      }
    }
  }
  return out;
}

export function useChat() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ClientChatMessage[] | null>(null);
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(true);
  const push = useToastStore((s) => s.push);
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

  /** Mesaj gönderir; asistanın cevabını döner, başarısızsa null (metin geri konabilsin diye). */
  async function send(text: string, mode: ChatMode = "yazi"): Promise<ClientChatMessage | null> {
    const message = text.trim();
    if (!message || sending) return null;
    setSending(true);
    const optimistic: ClientChatMessage = { id: -Date.now(), conversationId: conversationId ?? "", role: "user", content: message, createdAt: new Date().toISOString(), meta: null };
    setMessages((m) => [...(m ?? []), optimistic]);
    try {
      const r = await sendChat(conversationId, message, mode);
      const fresh = [r.userMessage, r.marks, r.reply, r.todo].filter((x): x is ClientChatMessage => x !== null);
      // Yeni sohbet açıldıysa (ilk mesaj ya da uzun sessizlik) ekranda yalnızca yenisi.
      if (r.conversationId !== conversationId) setMessages(fresh);
      else
        setMessages((m) => [
          // "geri al" komutu eski satırı yerinde günceller
          ...(m ?? []).filter((x) => x.id !== optimistic.id).map((x) => (r.undone && x.id === r.undone.id ? r.undone : x)),
          ...fresh,
        ]);
      setConversationId(r.conversationId);
      conversationRef.current = r.conversationId;
      storeConversationId(r.conversationId);
      return r.reply;
    } catch (err) {
      setMessages((m) => (m ?? []).filter((x) => x.id !== optimistic.id));
      push({ title: "Gönderilemedi", description: err instanceof Error ? err.message : undefined, variant: "danger" });
      return null;
    } finally {
      setSending(false);
    }
  }

  /** Planlı konuşma (Faz 4) sunucuda bir sohbete yazıldı: bu sohbetse ekle, değilse o sohbete geç. */
  function receive(message: ClientChatMessage) {
    if (message.conversationId === conversationRef.current) {
      setMessages((m) => (m?.some((x) => x.id === message.id) ? m : [...(m ?? []), message]));
      return;
    }
    fetchChat(message.conversationId)
      .then((r) => {
        setConversationId(r.conversationId);
        conversationRef.current = r.conversationId;
        storeConversationId(r.conversationId);
        setMessages(r.messages);
      })
      .catch(() => null);
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

  /** İşlem kartındaki "Geri al": işaretleme/listeye ekleme sunucuda geri alınır, not silinir. */
  async function undo(item: Extract<ChatItem, { kind: "islem" }>) {
    const msg = messages?.find((m) => m.id === item.id);
    if (!msg) return;
    try {
      if (msg.meta?.memoryId) {
        await deleteMemoryNote(msg.meta.memoryId);
        setMessages((list) => (list ?? []).map((x) => (x.id === msg.id ? { ...x, content: "Not silindi", meta: null } : x)));
      } else {
        const { message } = await undoChatMark(msg.id);
        setMessages((list) => (list ?? []).map((x) => (x.id === msg.id ? message : x)));
      }
    } catch (err) {
      push({ title: "Geri alınamadı", description: err instanceof Error ? err.message : undefined, variant: "danger" });
    }
  }

  const items = useMemo(() => (messages ? toChatItems(messages) : []), [messages]);
  return { items, loaded: messages !== null, empty: messages?.length === 0, sending, online, send, receive, newConversation, undo };
}
