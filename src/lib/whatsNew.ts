/**
 * When the guide should open on its own.
 *
 * Two moments deserve it, and only those two: the first time someone opens
 * Attend, when a walk-through saves them guessing, and the first launch after
 * an update, when What's new says what changed. Everything else is a tap away
 * in Settings and should never interrupt.
 *
 * The marker is per device, in localStorage. It deliberately isn't synced:
 * having read the guide on a phone says nothing about a laptop you have just
 * signed into, and nothing here is worth a round trip.
 */

const KEY = 'attend.lastSeenVersion';

export function getSeenVersion(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null; // private mode, or storage switched off
  }
}

export function setSeenVersion(version: string): void {
  try {
    localStorage.setItem(KEY, version);
  } catch {
    // Nothing to do: the guide simply offers itself again next time.
  }
}

/**
 * True when `a` ("x.y.z") is strictly newer than `b`. A missing `b` counts as
 * older than anything, so a first-ever launch always reads as new.
 */
export function isNewerVersion(a: string, b: string | null): boolean {
  if (!b) return true;
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}
