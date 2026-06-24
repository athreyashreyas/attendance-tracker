import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { clearLocalDb } from '../lib/db';
import { syncEngine } from '../lib/sync';
import { queryClient } from '../lib/queryClient';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  setSession: (session) =>
    set({ session, user: session?.user ?? null, isLoading: false }),
  signOut: async () => {
    await supabase.auth.signOut();
    syncEngine.reset();
    await clearLocalDb();
    // Drop any cached query data so the next account doesn't briefly see the
    // previous user's courses/sessions (the cache outlives the local DB clear).
    queryClient.clear();
    set({ session: null, user: null, isLoading: false });
  },
}));

let initialized = false;

/** Wire Supabase auth state into the store. Call once at app startup. */
export function initAuth(): void {
  if (initialized) return;
  initialized = true;

  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.getState().setSession(data.session);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
  });
}
