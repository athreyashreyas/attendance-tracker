import { addDays } from 'date-fns';
import type { Session, User } from '@supabase/supabase-js';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { supabase } from '../lib/supabase';
import { syncEngine } from '../lib/sync';
import { nowIso, toDateKey } from '../utils/dates';
import type { Semester } from '../types';

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
    await createFirstSemester(data.user.id);
    await syncEngine.initialHydrate(data.user.id);
    return { error: null, needsConfirmation: false };
  }
  // Email confirmation required by the project settings.
  return { error: null, needsConfirmation: true };
}

/** Auto-create an active "Semester 1" spanning the next 180 days. */
async function createFirstSemester(userId: string): Promise<void> {
  const today = new Date();
  const semester: Semester = {
    id: crypto.randomUUID(),
    user_id: userId,
    name: 'Semester 1',
    start_date: toDateKey(today),
    end_date: toDateKey(addDays(today, 180)),
    is_active: true,
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  };
  await syncEngine.writeLocal('semesters', 'INSERT', semester);
  useUiStore.getState().setActiveSemester(semester.id);
}
