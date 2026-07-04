import { useEffect } from 'react';

/**
 * Calls `onDismiss` when the user presses Escape, as long as `active` is true.
 * Works alongside backdrop-click handlers — both paths call the same close fn.
 */
export function useDismiss(onDismiss: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onDismiss();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, onDismiss]);
}
