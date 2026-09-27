import { create } from "zustand";
import { uid } from "@/lib/utils";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  action?: ToastAction;
  variant?: "default" | "success" | "danger";
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id">) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = uid();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Kısayol: silme/kayıt sonrası "Geri al" toast'u göstermek için. */
export function showUndoToast(title: string, onUndo: () => void, description?: string) {
  useToastStore.getState().push({ title, description, action: { label: "Geri al", onClick: onUndo } });
}
