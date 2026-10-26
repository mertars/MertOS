import { cn } from "@/lib/utils";

/** Faz 3 cam kart. `accent`: bölüm rengi değişkeni (ör. "--fx-saglik"); `index`: giriş animasyonu sırası. */
export function GlassCard({
  accent = "--fx-text",
  index = 0,
  className,
  children,
  as: Tag = "section",
}: {
  accent?: string;
  index?: number;
  className?: string;
  children: React.ReactNode;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag className={cn("fx-glass fx-enter p-4", className)} style={{ ["--accent" as string]: `var(${accent})`, ["--i" as string]: index }}>
      {children}
    </Tag>
  );
}

export function CardLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--accent)_80%,white)]", className)}>{children}</p>;
}
