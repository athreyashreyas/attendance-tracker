import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { syncEngine } from '../lib/sync';
import type { TableName } from '../types';

/**
 * Subscribe to Supabase realtime once a user is signed in. Remote changes are
 * mirrored into Dexie by the SyncEngine, which then emits an 'attend:sync'
 * window event; here we translate that into TanStack Query invalidations.
 */
export function useRealtime(userId: string | null | undefined): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    syncEngine.subscribeRealtime(userId);

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ table?: TableName }>).detail;
      switch (detail?.table) {
        case 'semesters':
          void queryClient.invalidateQueries({ queryKey: ['semesters'] });
          break;
        case 'courses':
          void queryClient.invalidateQueries({ queryKey: ['courses'] });
          void queryClient.invalidateQueries({ queryKey: ['course'] });
          break;
        case 'sessions':
          void queryClient.invalidateQueries({ queryKey: ['sessions'] });
          void queryClient.invalidateQueries({ queryKey: ['allSessions'] });
          break;
        default:
          void queryClient.invalidateQueries();
      }
    };

    window.addEventListener('attend:sync', handler);
    return () => window.removeEventListener('attend:sync', handler);
  }, [userId, queryClient]);
}
