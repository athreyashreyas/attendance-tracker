import type { Session, User } from '@supabase/supabase-js';
import { selectUserId, useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { syncEngine } from '../lib/sync';
import {
  INTERACTIVE_TIMEOUT_MS,
  isTimeoutError,
  settleWithin,
  withTimeout,
} from '../lib/timeout';

interface UseAuth {
  session: Session | null;
  user: User | null;
  /** The account to show data for, including a boot that could not reach auth. */
  userId: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuth {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const userId = useAuthStore(selectUserId);
  const isLoading = useAuthStore((s) => s.isLoading);
  const signOut = useAuthStore((s) => s.signOut);
  return { session, user, userId, isLoading, signOut };
}

/** Shown when a request ran out of time rather than coming back refused. */
export const UNREACHABLE_MESSAGE =
  "We couldn't reach the server. Check your connection and try again in a moment.";

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  let data;
  try {
    // Bounded so the button cannot spin forever against a server that has
    // accepted the request but will never answer it.
    const result = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      INTERACTIVE_TIMEOUT_MS
    );
    if (result.error) {
      return { error: isTimeoutError(result.error) ? UNREACHABLE_MESSAGE : result.error.message };
    }
    data = result.data;
  } catch (error) {
    if (isTimeoutError(error)) return { error: UNREACHABLE_MESSAGE };
    throw error;
  }

  // The first pull is a convenience, not a precondition for being signed in:
  // if it is slow or fails, the app opens anyway and syncs in the background.
  if (data.user) {
    await settleWithin(syncEngine.initialHydrate(data.user.id), INTERACTIVE_TIMEOUT_MS, undefined);
  }
  return { error: null };
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ error: string | null; needsConfirmation: boolean }> {
  let data;
  try {
    const result = await withTimeout(
      supabase.auth.signUp({ email, password }),
      INTERACTIVE_TIMEOUT_MS
    );
    if (result.error) {
      return {
        error: isTimeoutError(result.error) ? UNREACHABLE_MESSAGE : result.error.message,
        needsConfirmation: false,
      };
    }
    data = result.data;
  } catch (error) {
    if (isTimeoutError(error)) return { error: UNREACHABLE_MESSAGE, needsConfirmation: false };
    throw error;
  }

  if (data.session && data.user) {
    // New users start with a clean slate: add classes (standalone by default),
    // and optionally group them into a semester later.
    await settleWithin(syncEngine.initialHydrate(data.user.id), INTERACTIVE_TIMEOUT_MS, undefined);
    return { error: null, needsConfirmation: false };
  }
  // Email confirmation required by the project settings.
  return { error: null, needsConfirmation: true };
}
