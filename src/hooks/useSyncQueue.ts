import { useSyncStore } from '../stores/syncStore';
import { syncEngine } from '../lib/sync';

export interface SyncQueueState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  isOnline: boolean;
  flush: () => void;
}

/** Read sync status from the store and expose a manual flush trigger. */
export function useSyncQueue(): SyncQueueState {
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const isOnline = useSyncStore((s) => s.isOnline);

  return {
    isSyncing,
    pendingCount,
    lastSyncAt,
    isOnline,
    flush: () => void syncEngine.flushQueue(),
  };
}
