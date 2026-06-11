import { useSyncStore } from '../stores/syncStore';

/** Reactive online/offline flag, sourced from the sync store's listeners. */
export function useNetwork(): boolean {
  return useSyncStore((s) => s.isOnline);
}
