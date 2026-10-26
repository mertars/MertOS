"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { MessageCirclePlus } from "lucide-react";
import { useChat } from "@/lib/assistant/use-chat";
import { useDictation } from "@/lib/assistant/use-dictation";
import { useAssistantSettings } from "@/lib/assistant/use-settings";
import { speak, stopSpeaking, unlockVoice, useVoiceState } from "@/lib/assistant/voice";
import { useToastStore } from "@/lib/store/toast-store";
import { cn } from "@/lib/utils";
import { AssistantMark, ChatList, ChatScroll, Composer, SuggestionChips } from "./chat-view";
import { MicOrb } from "./mic-orb";
import { useProactiveMessages } from "./proactive";

// Asistan paneli (Faz 3): sohbet + mikrofon. Telefonda tam ekran (mikrofon alt
// yarıda, tek elle); bilgisayarda 3 sütunlu görünümün ortası (büyük mikrofon,
// altında sohbet). Mikrofon (Faz 4): tarayıcı konuşma tanıma (tr-TR) söyleneni yazıya
// döker, "ses" kipinde (kısa cevap) gönderilir, cevap seçili sesle okunur; konuşurken
// küreye dokunmak susturur. Planlı konuşmalar (proactive.tsx) bu sohbete eklenir.

const SUGGESTIONS = ["Bugün ne yesem?", "Programım ne?", "Yarın ne var?", "Koştum"];

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribeDesktop(l: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", l);
  return () => mq.removeEventListener("change", l);
}

/** Bilgisayar düzeni mi? (Tailwind `lg`.) Sunucuda telefon varsayılır. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP_QUERY).matches, () => false);
}

export function AssistantPanel({ layout }: { layout: "phone" | "desktop" }) {
  const chat = useChat();
  const [input, setInput] = useState("");
  const push = useToastStore((s) => s.push);
  const settings = useAssistantSettings();
  const voice = useVoiceState();
  // Mikrofonla söylenen: "ses" kipinde (kısa cevap) gönderilir, cevap sesli okunur.
  const dictation = useDictation(async (text) => {
    const reply = await chat.send(text, "ses");
    if (reply && settings.sesliOkuma) void speak(reply.content, settings.ses);
  });
  useProactiveMessages(chat.receive);

  useEffect(() => {
    if (dictation.error) push({ title: dictation.error, variant: "danger" });
  }, [dictation.error, push]);

  async function submit() {
    const text = input;
    setInput("");
    if (!(await chat.send(text))) setInput(text);
  }

  function toggleMic() {
    // dokunuş: tarayıcının ses kilidini de açar (cevap sesli okunabilsin)
    unlockVoice();
    if (voice.speaking) stopSpeaking();
    else if (dictation.listening) dictation.stop();
    else void dictation.start();
  }

  const orbActive = dictation.listening || voice.speaking;
  const orbSource = dictation.listening ? dictation.source : voice.speaking ? (voice.analyser ?? "demo") : null;

  const desktop = layout === "desktop";
  const mic = (
    <div className="flex flex-col items-center">
      <p
        className={cn(
          "mb-4 line-clamp-2 min-h-5 max-w-[320px] text-center leading-snug transition-opacity duration-300",
          desktop ? "text-[15px]" : "text-[14px]",
          dictation.listening ? "opacity-100" : "opacity-0",
        )}
        aria-live="polite"
      >
        {dictation.interim || <span className="text-[var(--fx-text-3)]">Dinliyorum…</span>}
      </p>
      <MicOrb
        size={desktop ? 150 : 96}
        active={orbActive}
        source={orbSource}
        onClick={toggleMic}
        label={voice.speaking ? "Susmasını sağla" : dictation.listening ? "Konuşmayı bitir" : "Konuş"}
      />
      <p className={cn("fx-num text-[9.5px] tracking-[0.22em] text-[var(--fx-text-3)]", desktop ? "mt-8" : "mt-5")}>
        {voice.speaking ? "KONUŞUYOR · SUSTURMAK İÇİN DOKUN" : dictation.listening ? "BİTİRMEK İÇİN DOKUN" : chat.sending ? "DÜŞÜNÜYOR" : "DOKUN VE KONUŞ"}
      </p>
    </div>
  );

  const conversation = (
    <ChatScroll className={cn("relative flex-1", desktop ? "mt-4 px-1" : "mt-3")} watch={`${chat.items.length}-${chat.sending}`}>
      {chat.loaded && chat.empty ? (
        <div className="flex gap-3 pt-6">
          <span className="mt-1 w-[22px] shrink-0">
            <AssistantMark />
          </span>
          <p className="text-[15px] leading-[1.55] text-[var(--fx-text-2)]">
            Merhaba. Yazabilir ya da mikrofona dokunup konuşabilirsiniz — “Elimde yumurta ve ıspanak var”, “Dün ne yedim?”, “Koştum, duş da aldım”…
          </p>
        </div>
      ) : (
        <ChatList items={chat.items} typing={chat.sending} compact={desktop} onUndo={chat.undo} />
      )}
    </ChatScroll>
  );

  const inputArea = (
    <div className="space-y-2.5">
      <SuggestionChips items={SUGGESTIONS} disabled={chat.sending || !chat.online} onPick={(s) => void chat.send(s)} />
      <Composer
        value={input}
        onChange={setInput}
        onSubmit={submit}
        disabled={chat.sending || !chat.online}
        placeholder={chat.online ? "Asistana yaz…" : "İnternet yok — sohbet kapalı"}
      />
    </div>
  );

  if (desktop) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="relative shrink-0 pt-4">
          {mic}
          <button
            type="button"
            onClick={chat.newConversation}
            aria-label="Yeni sohbet"
            className="fx-glass absolute right-0 top-2 grid h-10 w-10 place-items-center text-[var(--fx-text-2)]"
            style={{ ["--accent" as string]: "var(--fx-text)", ["--fx-radius" as string]: "999px" }}
          >
            <MessageCirclePlus className="h-4 w-4" />
          </button>
        </div>
        {conversation}
        <div className="mt-2 shrink-0">{inputArea}</div>
      </div>
    );
  }

  return (
    <main className="flex h-[calc(100dvh-7rem)] flex-col px-4 pt-[max(env(safe-area-inset-top),18px)]">
      <header className="fx-enter flex shrink-0 items-center justify-between">
        <div>
          <p className="fx-num text-[10.5px] tracking-[0.12em] text-[var(--fx-text-3)]">ASİSTAN · {chat.online ? "ÇEVRİMİÇİ" : "ÇEVRİMDIŞI"}</p>
          <h1 className="text-[26px] font-semibold tracking-tight">Konuşalım</h1>
        </div>
        <button
          type="button"
          onClick={chat.newConversation}
          aria-label="Yeni sohbet"
          className="fx-glass grid h-11 w-11 place-items-center text-[var(--fx-text-2)]"
          style={{ ["--accent" as string]: "var(--fx-text)", ["--fx-radius" as string]: "999px" }}
        >
          <MessageCirclePlus className="h-[18px] w-[18px]" />
        </button>
      </header>
      {conversation}
      <div className="shrink-0 pb-3 pt-2">
        {mic}
        <div className="mt-4">{inputArea}</div>
      </div>
    </main>
  );
}
