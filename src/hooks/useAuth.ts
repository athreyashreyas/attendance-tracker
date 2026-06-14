import type { Session, User } from '@supabase/supabase-js';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { syncEngine } from '../lib/sync';

interface UseAuth {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuth {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const signOut = useAuthStore((s) => s.signOut);
  return { session, user, isLoading, signOut };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: error.message };
  if (data.user) await syncEngine.initialHydrate(data.user.id);
  return { error: null };
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ error: string | null; needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message, needsConfirmation: false };

  if (data.session && data.user) {
    // New users start with a clean slate: add classes (standalone by default),
    // and optionally group them into a semester later.
    await syncEngine.initialHydrate(data.user.id);
    return { error: null, needsConfirmation: false };
  }
  // Email confirmation required by the project settings.
  return { error: null, needsConfirmation: true };
}
