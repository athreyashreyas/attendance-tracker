import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { clearLocalDb } from '../lib/db';
import { syncEngine } from '../lib/sync';
import { queryClient } from '../lib/queryClient';
import { BOOT_AUTH_TIMEOUT_MS, INTERACTIVE_TIMEOUT_MS, withTimeout } from '../lib/timeout';
import { forgetUser, lastUserId, rememberUser } from '../lib/lastSession';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  /**
   * Set when the boot could not reach auth but this device had a session. The
   * app opens on local data; every server call still needs the real token, so
   * this only decides what is shown, never what is permitted.
   */
  unverifiedUserId: string | null;
  setSession: (session: Session | null) => void;
  bootUnverified: (userId: string) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  unverifiedUserId: null,
  setSession: (session) => {
    if (session) rememberUser(session.user.id);
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
      // A confirmed answer supersedes any provisional one.
      unverifiedUserId: null,
    });
  },
  bootUnverified: (userId) =>
    set({ session: null, user: null, isLoading: false, unverifiedUserId: userId }),
  signOut: async () => {
    // The local wipe is the part that actually matters for privacy on a shared
    // device, so it must not be gated on a server that may not answer. Bound
    // the call and carry on: an unreachable server still gets the sign-out on
    // its next refresh, when the refresh token is rejected.
    try {
      await withTimeout(supabase.auth.signOut(), INTERACTIVE_TIMEOUT_MS);
    } catch (error) {
      console.warn('Sign-out did not reach the server; clearing this device anyway.', error);
    }
    forgetUser();
    syncEngine.reset();
    await clearLocalDb();
    // Drop any cached query data so the next account doesn't briefly see the
    // previous user's courses/sessions (the cache outlives the local DB clear).
    queryClient.clear();
    set({ session: null, user: null, isLoading: false, unverifiedUserId: null });
  },
}));

/**
 * The account whose data should be on screen: a confirmed session when we have
 * one, otherwise the provisional boot. Null means nobody is signed in.
 */
export function selectUserId(state: AuthState): string | null {
  return state.session?.user?.id ?? state.unverifiedUserId;
}

let initialized = false;

/** Wire Supabase auth state into the store. Call once at app startup. */
export function initAuth(): void {
  if (initialized) return;
  initialized = true;

  void resolveInitialSession();

  supabase.auth.onAuthStateChange((_event, session) => {
    // A late answer is still worth having: it upgrades a provisional boot into
    // a confirmed one, or signs the device out if the token was rejected.
    useAuthStore.getState().setSession(session);
    if (!session) forgetUser();
  });
}

/**
 * Settle the app into a definite state at startup, whatever the server does.
 *
 * getSession() is not purely local: on an expired access token it awaits a
 * refresh over the network (auth-js GoTrueClient, _callRefreshToken). When that
 * request hangs, an unbounded await here leaves isLoading true forever and the
 * app never gets past its splash. Since access tokens last an hour, that is the
 * ordinary path for anyone returning to the app, not an edge case.
 */
async function resolveInitialSession(): Promise<void> {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      BOOT_AUTH_TIMEOUT_MS
    );
    // A failed refresh comes back as an error beside a null session rather than
    // as a rejection. Treating that as "signed out" would push someone with a
    // perfectly good local database to a sign-in form, so route it to the same
    // fallback as a hang.
    if (error) throw error;
    useAuthStore.getState().setSession(data.session);
    if (!data.session) forgetUser();
  } catch (error) {
    // Unreachable, too slow, or refused. Dexie is the source of truth and holds
    // everything the first screen needs, so a device that was signed in opens
    // on its own data rather than being bounced to a sign-in form it cannot
    // complete. onAuthStateChange corrects this once the server answers.
    const known = lastUserId();
    console.warn('Could not confirm the session at startup.', error);
    if (known) useAuthStore.getState().bootUnverified(known);
    else useAuthStore.getState().setSession(null);
  }
}
