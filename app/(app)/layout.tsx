import { FxAppShell } from "@/components/fx/app-shell";
import { QuickAddSheet } from "@/components/shell/quick-add-sheet";

// Faz 3: yeni kabuk (efekt seviyesi, hareketli arka plan, telefonda 5 sekme,
// bilgisayarda üst sekmeler). Eski alt sekme çubuğu kaldırıldı; eski modüllerin
// Hızlı Ekle penceresi duruyor.
export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <FxAppShell>
      {children}
      <QuickAddSheet />
    </FxAppShell>
  );
}
