/**
 * A record of who was last signed in on this device.
 *
 * Written when auth confirms a session and cleared on sign-out, so that a boot
 * which cannot reach the server still knows whose local data to open. Kept as
 * our own key rather than read out of Supabase's session blob: the shape of
 * that blob is a library implementation detail, and this only needs an id.
 *
 * It is not a credential and grants nothing on its own. Every server request
 * still carries the real token, and sign-out clears both this and the local
 * database, so it cannot expose one account's data to the next person here.
 */

const KEY = 'attend.lastUserId';

export function rememberUser(userId: string): void {
  try {
    localStorage.setItem(KEY, userId);
  } catch {
    // Private mode or a full quota: the app still works, it just cannot boot
    // offline next time.
  }
}

export function forgetUser(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function lastUserId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
