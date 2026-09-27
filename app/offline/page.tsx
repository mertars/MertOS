import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center pt-safe pb-safe">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-[var(--color-text-secondary)]">
        <WifiOff className="h-6 w-6" />
      </div>
      <p className="text-[17px] font-semibold text-[var(--color-text-primary)]">Bu sayfa henüz önbelleğe alınmadı</p>
      <p className="text-[13px] text-[var(--color-text-secondary)] max-w-[30ch]">
        MertOS verilerin telefonunda saklanır ve çoğu ekran offline çalışır. Bu sayfayı görmek için bir kez
        internetteyken açman yeterli.
      </p>
    </div>
  );
}
