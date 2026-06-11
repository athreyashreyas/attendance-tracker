import { create } from 'zustand';

interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  isOnline: boolean;
  setIsSyncing: (v: boolean) => void;
  setPendingCount: (n: number) => void;
  setLastSyncAt: (d: Date | null) => void;
  setIsOnline: (v: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  setIsSyncing: (v) => set({ isSyncing: v }),
  setPendingCount: (n) => set({ pendingCount: n }),
  setLastSyncAt: (d) => set({ lastSyncAt: d }),
  setIsOnline: (v) => set({ isOnline: v }),
}));
