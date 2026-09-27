import { create } from "zustand";

interface LockState {
  unlocked: boolean;
  lastActiveAt: number;
  unlock: () => void;
  lock: () => void;
  touch: () => void;
}

/** PIN kilidi durumu — kalıcı DEĞİLDİR (bellekte). Uygulama her yeniden açılışta kilitlenir. */
export const useLockStore = create<LockState>((set) => ({
  unlocked: false,
  lastActiveAt: Date.now(),
  unlock: () => set({ unlocked: true, lastActiveAt: Date.now() }),
  lock: () => set({ unlocked: false }),
  touch: () => set({ lastActiveAt: Date.now() }),
}));
