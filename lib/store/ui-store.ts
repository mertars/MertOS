import { create } from "zustand";

interface UiState {
  quickAddOpen: boolean;
  openQuickAdd: (prefill?: string) => void;
  closeQuickAdd: () => void;
  quickAddPrefill: string | null;
  dashboardEditMode: boolean;
  setDashboardEditMode: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  quickAddOpen: false,
  quickAddPrefill: null,
  openQuickAdd: (prefill) => set({ quickAddOpen: true, quickAddPrefill: prefill ?? null }),
  closeQuickAdd: () => set({ quickAddOpen: false, quickAddPrefill: null }),
  dashboardEditMode: false,
  setDashboardEditMode: (v) => set({ dashboardEditMode: v }),
}));
