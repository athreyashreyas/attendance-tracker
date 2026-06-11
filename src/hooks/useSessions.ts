import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { syncEngine } from '../lib/sync';
import { useAuthStore } from '../stores/authStore';
import { nowIso } from '../utils/dates';
import { toRemote } from '../utils/records';
import type { Session, SessionStatus } from '../types';

async function loadSessions(courseId: string): Promise<Session[]> {
  const sessions = await db.sessions
    .where('course_id')
    .equals(courseId)
    .filter((s) => !s.deleted_at)
    .toArray();
  return sessions.sort((a, b) =>
    b.scheduled_date.localeCompare(a.scheduled_date)
  );
}

export function useSessions(courseId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', courseId],
    queryFn: () => loadSessions(courseId as string),
    enabled: !!courseId,
  });
}

export function useAllSessions() {
  return useQuery({
    queryKey: ['allSessions'],
    queryFn: () => db.sessions.filter((s) => !s.deleted_at).toArray(),
  });
}

/** Find an existing non-deleted session for a course on a given date. */
export async function findSessionForDate(
  courseId: string,
  dateKey: string
): Promise<Session | undefined> {
  return db.sessions
    .where('course_id')
    .equals(courseId)
    .filter((s) => s.scheduled_date === dateKey && !s.deleted_at)
    .first();
}

export interface SessionInput {
  id?: string;
  course_id: string;
  scheduled_date: string;
  status: SessionStatus;
  notes?: string | null;
}

export function useSessionMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['sessions'] });
    void queryClient.invalidateQueries({ queryKey: ['allSessions'] });
  };

  async function saveSession(input: SessionInput): Promise<Session> {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    const existing = input.id ? await db.sessions.get(input.id) : undefined;
    const now = nowIso();
    const session: Session = {
      id: input.id ?? crypto.randomUUID(),
      course_id: input.course_id,
      user_id: userId,
      scheduled_date: input.scheduled_date,
      status: input.status,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      deleted_at: null,
    };
    await syncEngine.writeLocal(
      'sessions',
      input.id ? 'UPDATE' : 'INSERT',
      session
    );
    invalidate();
    return session;
  }

  /** Upsert by course+date: edits an existing session if one already exists. */
  async function markSession(
    courseId: string,
    dateKey: string,
    status: SessionStatus
  ): Promise<Session> {
    const existing = await findSessionForDate(courseId, dateKey);
    return saveSession({
      id: existing?.id,
      course_id: courseId,
      scheduled_date: dateKey,
      status,
      notes: existing?.notes ?? null,
    });
  }

  async function deleteSession(id: string): Promise<void> {
    const session = await db.sessions.get(id);
    if (!session) return;
    const now = nowIso();
    await syncEngine.writeLocal('sessions', 'DELETE', {
      ...toRemote(session),
      deleted_at: now,
      updated_at: now,
    });
    invalidate();
  }

  return { saveSession, markSession, deleteSession };
}
