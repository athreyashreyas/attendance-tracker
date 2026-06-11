import type { LocalRecord } from '../types';

/** Strip Dexie-only fields, yielding the clean remote row shape. */
export function toRemote<T extends LocalRecord>(
  record: T
): Omit<T, keyof LocalRecord> {
  const copy: Partial<T> = { ...record };
  delete copy.synced_at;
  delete copy._local_only;
  return copy as Omit<T, keyof LocalRecord>;
}
