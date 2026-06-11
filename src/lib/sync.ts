import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { db } from './db';
import { useSyncStore } from '../stores/syncStore';
import { nowIso } from '../utils/dates';
import type {
  TableName,
  SyncOperation,
  SyncQueueItem,
  RowByTable,
  Semester,
  Course,
  Session,
  LocalSemester,
  LocalCourse,
  LocalSession,
} from '../types';

const TABLES: TableName[] = ['semesters', 'courses', 'sessions'];
const MAX_RETRIES = 5;
const LAST_SYNC_PREFIX = 'attend_last_sync_';

type AnyLocal = LocalSemester | LocalCourse | LocalSession;

/**
 * SyncEngine handles bidirectional sync between Dexie (local) and Supabase.
 *
 * Reads always come from Dexie. Writes go to Dexie first (optimistic) and are
 * queued for replay against Supabase. Soft deletes are modelled as upserts that
 * carry `deleted_at`, so the queue only ever needs to upsert the current row.
 */
export class SyncEngine {
  private channel: RealtimeChannel | null = null;
  private flushing = false;
  private flushAgain = false;
  private networkAttached = false;

  // ---------------------------------------------------------------- hydrate

  /**
   * Pull the user's records from Supabase into Dexie. First call pulls every
   * non-deleted row; subsequent calls only pull rows changed since last sync.
   */
  async initialHydrate(userId: string): Promise<void> {
    const key = LAST_SYNC_PREFIX + userId;
    const lastSync = localStorage.getItem(key);
    useSyncStore.getState().setIsSyncing(true);
    try {
      for (const table of TABLES) {
        let query = supabase.from(table).select('*').eq('user_id', userId);
        query = lastSync
          ? query.gt('updated_at', lastSync) // delta: include soft-deletes
          : query.is('deleted_at', null); // first load: skip tombstones
        const { data, error } = await query;
        if (error || !data) continue;
        const now = nowIso();
        const rows = (data as RowByTable[typeof table][]).map((r) => ({
          ...r,
          synced_at: now,
        }));
        await this.bulkPutLocal(table, rows as AnyLocal[]);
      }
      localStorage.setItem(key, new Date().toISOString());
      useSyncStore.getState().setLastSyncAt(new Date());
    } finally {
      useSyncStore.getState().setIsSyncing(false);
    }
    void this.flushQueue();
  }

  // ------------------------------------------------------------------ write

  /**
   * Optimistically write a record to Dexie, queue it for Supabase, and kick off
   * a non-blocking flush. `record` is the remote-shaped row (no local fields).
   */
  async writeLocal<T extends TableName>(
    table: T,
    operation: SyncOperation,
    record: RowByTable[T]
  ): Promise<void> {
    const localRecord = { ...record, synced_at: null } as AnyLocal;
    try {
      await this.putLocal(table, localRecord);
    } catch (e) {
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        window.dispatchEvent(new CustomEvent('attend:quota'));
      }
      throw e;
    }

    await db.sync_queue.add({
      table_name: table,
      operation,
      record_id: record.id,
      payload: JSON.stringify(record),
      created_at: nowIso(),
      retry_count: 0,
    });
    await this.refreshPendingCount();
    void this.flushQueue();
  }

  // --------------------------------------------------------------- flushing

  /** Replay all queued writes against Supabase, oldest first. */
  async flushQueue(): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await this.refreshPendingCount();
      return;
    }
    if (this.flushing) {
      this.flushAgain = true;
      return;
    }
    this.flushing = true;
    useSyncStore.getState().setIsSyncing(true);
    try {
      const items = (await db.sync_queue.orderBy('created_at').toArray()).filter(
        (i) => i.retry_count >= 0
      );
      let didRefresh = false;
      for (const item of items) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) break;
        let error = await this.pushItem(item);
        if (error && !didRefresh && this.isAuthError(error)) {
          didRefresh = true;
          await supabase.auth.refreshSession();
          error = await this.pushItem(item);
        }
        if (error) {
          const next = item.retry_count + 1;
          await db.sync_queue.update(item.id!, {
            retry_count: next >= MAX_RETRIES ? -1 : next,
          });
          if (this.isNetworkError(error)) break;
        } else {
          await db.sync_queue.delete(item.id!);
          await this.markSynced(item.table_name, item.record_id);
        }
      }
      useSyncStore.getState().setLastSyncAt(new Date());
    } finally {
      this.flushing = false;
      useSyncStore.getState().setIsSyncing(false);
      await this.refreshPendingCount();
      if (this.flushAgain) {
        this.flushAgain = false;
        void this.flushQueue();
      }
    }
  }

  private async pushItem(item: SyncQueueItem): Promise<unknown> {
    try {
      const payload: unknown = JSON.parse(item.payload);
      // Dispatch per concrete table so postgrest infers a single row type
      // (a union payload would be narrowed to the first member and rejected).
      switch (item.table_name) {
        case 'semesters':
          return (await supabase.from('semesters').upsert(payload as Semester))
            .error;
        case 'courses':
          return (await supabase.from('courses').upsert(payload as Course)).error;
        case 'sessions':
          return (await supabase.from('sessions').upsert(payload as Session))
            .error;
        default:
          return new Error(`Unknown table: ${item.table_name}`);
      }
    } catch (e) {
      return e;
    }
  }

  // --------------------------------------------------------------- realtime

  /** Subscribe to remote changes for this user and mirror them into Dexie. */
  subscribeRealtime(userId: string): void {
    if (this.channel) return;
    const channel = supabase.channel('attend-realtime');
    for (const table of TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
        (payload: {
          eventType: 'INSERT' | 'UPDATE' | 'DELETE';
          new: Record<string, unknown>;
          old: Record<string, unknown>;
        }) => {
          void this.handleRealtime(table, payload);
        }
      );
    }
    channel.subscribe();
    this.channel = channel;
  }

  private async handleRealtime(
    table: TableName,
    payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: Record<string, unknown>;
      old: Record<string, unknown>;
    }
  ): Promise<void> {
    if (payload.eventType === 'DELETE') {
      const id = payload.old.id as string | undefined;
      if (id) await this.updateLocal(table, id, { deleted_at: nowIso() });
    } else {
      const row = { ...payload.new, synced_at: nowIso() } as AnyLocal;
      await this.putLocal(table, row);
    }
    window.dispatchEvent(new CustomEvent('attend:sync', { detail: { table } }));
  }

  // ------------------------------------------------------------- lifecycle

  /** Attach window online/offline listeners once. */
  attachNetworkListeners(): void {
    if (this.networkAttached || typeof window === 'undefined') return;
    this.networkAttached = true;
    window.addEventListener('online', () => {
      useSyncStore.getState().setIsOnline(true);
      void this.flushQueue();
    });
    window.addEventListener('offline', () => {
      useSyncStore.getState().setIsOnline(false);
    });
  }

  /** Tear down realtime + clear per-user sync cursors. Call on sign-out. */
  reset(): void {
    if (this.channel) {
      void supabase.removeChannel(this.channel);
      this.channel = null;
    }
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LAST_SYNC_PREFIX)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  }

  async getPendingCount(): Promise<number> {
    return db.sync_queue.where('retry_count').notEqual(-1).count();
  }

  async refreshPendingCount(): Promise<void> {
    const count = await this.getPendingCount();
    useSyncStore.getState().setPendingCount(count);
  }

  // ----------------------------------------------------------- table helpers

  private async putLocal(table: TableName, record: AnyLocal): Promise<void> {
    switch (table) {
      case 'semesters':
        await db.semesters.put(record as LocalSemester);
        break;
      case 'courses':
        await db.courses.put(record as LocalCourse);
        break;
      case 'sessions':
        await db.sessions.put(record as LocalSession);
        break;
    }
  }

  private async bulkPutLocal(table: TableName, records: AnyLocal[]): Promise<void> {
    switch (table) {
      case 'semesters':
        await db.semesters.bulkPut(records as LocalSemester[]);
        break;
      case 'courses':
        await db.courses.bulkPut(records as LocalCourse[]);
        break;
      case 'sessions':
        await db.sessions.bulkPut(records as LocalSession[]);
        break;
    }
  }

  private async updateLocal(
    table: TableName,
    id: string,
    changes: Partial<AnyLocal>
  ): Promise<void> {
    switch (table) {
      case 'semesters':
        await db.semesters.update(id, changes as Partial<LocalSemester>);
        break;
      case 'courses':
        await db.courses.update(id, changes as Partial<LocalCourse>);
        break;
      case 'sessions':
        await db.sessions.update(id, changes as Partial<LocalSession>);
        break;
    }
  }

  private async markSynced(table: TableName, id: string): Promise<void> {
    await this.updateLocal(table, id, { synced_at: nowIso() });
  }

  // -------------------------------------------------------------- error utils

  private isAuthError(error: unknown): boolean {
    const msg = this.errorMessage(error).toLowerCase();
    const code = this.errorCode(error);
    return (
      code === '401' ||
      code === 'pgrst301' ||
      msg.includes('jwt') ||
      msg.includes('token is expired') ||
      msg.includes('unauthorized')
    );
  }

  private isNetworkError(error: unknown): boolean {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    const msg = this.errorMessage(error).toLowerCase();
    return msg.includes('fetch') || msg.includes('network');
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return String(error ?? '');
  }

  private errorCode(error: unknown): string {
    if (error && typeof error === 'object' && 'code' in error) {
      return String((error as { code: unknown }).code).toLowerCase();
    }
    return '';
  }
}

export const syncEngine = new SyncEngine();
