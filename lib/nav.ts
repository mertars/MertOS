import { Home, Grid2x2, BarChart3, Sparkles, type LucideIcon } from "lucide-react";

export interface TabDescriptor {
  id: string;
  label: string;
  href?: string;
  icon: LucideIcon;
  phase: 1 | 2;
  isQuickAdd?: boolean;
}

/** Alt tab bar — sadece `phase <= CURRENT_PHASE` olanlar gösterilir (bkz. lib/registry/modules.ts § CURRENT_PHASE). */
export const TABS: TabDescriptor[] = [
  { id: "bugun", label: "Bugün", href: "/bugun", icon: Home, phase: 1 },
  { id: "hublar", label: "Hub'lar", href: "/hublar", icon: Grid2x2, phase: 1 },
  { id: "hizli-ekle", label: "Ekle", icon: Sparkles, phase: 1, isQuickAdd: true },
  { id: "istatistik", label: "İstatistik", href: "/istatistik", icon: BarChart3, phase: 2 },
  { id: "koc", label: "Koç", href: "/koc", icon: Sparkles, phase: 2 },
];
