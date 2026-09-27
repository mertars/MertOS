import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  right,
  className,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-start justify-between px-5 pt-safe mt-4 mb-2", className)}>
      <div>
        {eyebrow && <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">{eyebrow}</p>}
        <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text-primary)]">{title}</h1>
      </div>
      <div className="flex items-center gap-2 pt-1">
        {right}
        <Link
          href="/ayarlar"
          aria-label="Ayarlar"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-card-raised)] border border-[var(--color-border-strong)] text-[13px] font-bold text-[var(--color-text-primary)]"
        >
          M
        </Link>
      </div>
    </header>
  );
}
