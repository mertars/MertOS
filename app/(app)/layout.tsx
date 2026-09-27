import { TabBar } from "@/components/shell/tab-bar";
import { QuickAddSheet } from "@/components/shell/quick-add-sheet";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex-1 pb-28">{children}</div>
      <TabBar />
      <QuickAddSheet />
    </div>
  );
}
