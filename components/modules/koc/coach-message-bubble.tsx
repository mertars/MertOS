import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoachMessage } from "@/lib/db/types";

const KIND_LABEL: Record<string, string> = {
  brifing: "Sabah Brifingi",
  haftalik_rapor: "Haftalık Rapor",
  program_onerisi: "Program Önerisi",
};

export function CoachMessageBubble({ message }: { message: CoachMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] rounded-[18px] px-4 py-2.5", isUser ? "bg-[var(--color-text-primary)] text-[var(--color-bg)]" : "bg-[var(--color-card-raised)] border border-[var(--color-border)]")}>
        {!isUser && message.kind && KIND_LABEL[message.kind] && (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-zihin)] mb-1">
            <Sparkles className="h-3 w-3" /> {KIND_LABEL[message.kind]}
          </p>
        )}
        <p className={cn("text-[14px] leading-relaxed whitespace-pre-wrap", isUser ? "text-[var(--color-bg)]" : "text-[var(--color-text-primary)]")}>{message.content}</p>
      </div>
    </div>
  );
}
