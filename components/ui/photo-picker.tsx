"use client";

import { useRef } from "react";
import { Camera, X } from "lucide-react";
import { compressImageFile } from "@/lib/media/compress-image";
import { cn } from "@/lib/utils";

export function PhotoPicker({
  previewUrl,
  onSelect,
  onRemove,
  label = "Fotoğraf ekle",
  className,
}: {
  previewUrl?: string | null;
  onSelect: (blob: Blob) => void;
  onRemove?: () => void;
  label?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const blob = await compressImageFile(file);
    onSelect(blob);
    e.target.value = "";
  }

  if (previewUrl) {
    return (
      <div className={cn("relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-[var(--color-border)]", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
            aria-label="Fotoğrafı kaldır"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[var(--color-border-strong)] text-[var(--color-text-tertiary)]",
        className,
      )}
    >
      <Camera className="h-5 w-5" />
      <span className="text-[10.5px] px-2 text-center leading-tight">{label}</span>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
    </button>
  );
}
