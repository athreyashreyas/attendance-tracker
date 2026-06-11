import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSyncQueue } from '../../hooks/useSyncQueue';

type State = 'offline' | 'pending' | 'synced';

export function SyncIndicator() {
  const { isOnline, pendingCount, isSyncing } = useSyncQueue();
  const [showLabel, setShowLabel] = useState(false);

  const state: State = !isOnline
    ? 'offline'
    : pendingCount > 0 || isSyncing
      ? 'pending'
      : 'synced';

  const dotColor =
    state === 'offline'
      ? 'bg-rose-500'
      : state === 'pending'
        ? 'bg-amber-500'
        : 'bg-sage-500';

  const label =
    state === 'offline'
      ? 'Offline'
      : state === 'pending'
        ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} pending`
        : 'Synced';

  return (
    <button
      type="button"
      onClick={() => setShowLabel((v) => !v)}
      className="flex items-center gap-1.5"
      aria-label={label}
    >
      <span
        className={`block h-2.5 w-2.5 rounded-full ${dotColor} ${
          state === 'pending' ? 'animate-pulse-dot' : ''
        }`}
      />
      <AnimatePresence>
        {showLabel && (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            className="font-sans text-xs text-ink-500"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
