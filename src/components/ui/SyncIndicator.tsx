import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { syncEngine } from '../../lib/sync';
import { useSyncQueue } from '../../hooks/useSyncQueue';
import { Modal } from './Modal';
import { Button } from './Button';
import { APP_VERSION } from '../../lib/changelog';

type SyncState = 'offline' | 'syncing' | 'synced';

const STATES: Record<SyncState, { dot: string; heading: string; body: string }> = {
  offline: {
    dot: 'bg-rose-500',
    heading: 'Offline',
    body: 'Changes are saved here and will sync when you reconnect.',
  },
  syncing: {
    dot: 'bg-amber-500',
    heading: 'Syncing',
    body: 'Uploading your latest changes to your account.',
  },
  synced: {
    dot: 'bg-sage-500',
    heading: 'Synced',
    body: 'Everything is backed up to your account.',
  },
};

/**
 * Dot anchored to the top-right of the scroll area (not the viewport), so it
 * scrolls away with the page instead of hovering over content. Reachable by
 * scrolling to the top. Passive status indicator (offline / syncing / synced)
 * and tappable button that opens a modal with a manual "Sync now" trigger and
 * the current app version.
 */
export function SyncDot() {
  const { isOnline, pendingCount, isSyncing } = useSyncQueue();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const state: SyncState = !isOnline
    ? 'offline'
    : pendingCount > 0 || isSyncing || running
      ? 'syncing'
      : 'synced';

  const { dot, heading, body } = STATES[state];
  const busy = running || isSyncing;

  async function handleSync() {
    if (!isOnline || busy || !userId) return;
    setRunning(true);
    try {
      await syncEngine.initialHydrate(userId);
      void navigator.serviceWorker?.ready.then((r) => r.update());
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute z-40 flex h-8 w-8 items-center justify-center"
        style={{
          top: 0,
          right: 'calc(var(--safe-right) + 0.6rem)',
        }}
        aria-label={`Sync status: ${heading}`}
      >
        <motion.span
          className={`block h-2.5 w-2.5 rounded-full ${dot}`}
          animate={
            state === 'syncing'
              ? { opacity: [1, 0.35, 1], scale: [1, 1.15, 1] }
              : { opacity: 1, scale: 1 }
          }
          transition={
            state === 'syncing'
              ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
        />
      </button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="mb-4 flex items-center gap-3">
          <span className={`block h-3 w-3 shrink-0 rounded-full ${dot}`} />
          <p className="font-serif text-xl text-ink-900">{heading}</p>
        </div>
        <p className="mb-5 font-sans text-sm text-ink-500">{body}</p>
        {isOnline ? (
          <Button
            className="w-full"
            onClick={() => void handleSync()}
            disabled={busy}
          >
            {busy ? 'Syncing…' : state === 'synced' ? 'Sync again' : 'Sync now'}
          </Button>
        ) : (
          <p className="font-sans text-sm text-ink-300">Come back online to sync.</p>
        )}
        <p className="mt-5 text-center font-sans text-xs text-ink-300">
          Attend {APP_VERSION}
        </p>
      </Modal>
    </>
  );
}
