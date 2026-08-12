import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { syncEngine } from '../lib/sync';
import { useAuthStore } from '../stores/authStore';
import { nowIso, fromDateKey } from '../utils/dates';
import { expectedClassesInRange } from '../lib/calculations';
import { slotOf } from '../lib/slots';
import type { Course, Session, SessionStatus } from '../types';

async function loadSessions(courseId: string): Promise<Session[]> {
  const sessions = await db.sessions
    .where('course_id')
    .equals(courseId)
    .filter((s) => !s.deleted_at)
    .toArray();
  // Newest day first, and within a day the classes in the order they happened.
  return sessions.sort(
    (a, b) =>
      b.scheduled_date.localeCompare(a.scheduled_date) || slotOf(a) - slotOf(b)
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

/** Every non-deleted session a course has on a date, first class of the day first. */
export async function sessionsOnDate(
  courseId: string,
  dateKey: string
): Promise<Session[]> {
  const rows = await db.sessions
    .where('course_id')
    .equals(courseId)
    .filter((s) => s.scheduled_date === dateKey && !s.deleted_at)
    .toArray();
  return rows.sort((a, b) => slotOf(a) - slotOf(b));
}

/**
 * Find an existing non-deleted session for one class of a day. Days used to
 * hold a single class, so rows written before slots existed answer to slot 1.
 */
export async function findSessionForDate(
  courseId: string,
  dateKey: string,
  slot = 1
): Promise<Session | undefined> {
  const rows = await sessionsOnDate(courseId, dateKey);
  return rows.find((s) => slotOf(s) === slot);
}

/** The slot a class added to this date should take: after everything on it. */
export async function nextSlotForDate(
  courseId: string,
  dateKey: string
): Promise<number> {
  const rows = await sessionsOnDate(courseId, dateKey);
  return rows.reduce((max, s) => Math.max(max, slotOf(s)), 0) + 1;
}

export interface SessionInput {
  id?: string;
  course_id: string;
  scheduled_date: string;
  /** Which class of the day this is. Defaults to the first. */
  slot?: number;
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
      slot: input.slot ?? (existing ? slotOf(existing) : 1),
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

  /**
   * Upsert one class of one day: edits that class if it's already been recorded.
   * A day holding two classes is marked one slot at a time, so marking the
   * second lecture never overwrites the first.
   */
  async function markSession(
    courseId: string,
    dateKey: string,
    status: SessionStatus,
    slot = 1
  ): Promise<Session> {
    const existing = await findSessionForDate(courseId, dateKey, slot);
    return saveSession({
      id: existing?.id,
      course_id: courseId,
      scheduled_date: dateKey,
      slot,
      status,
      notes: existing?.notes ?? null,
    });
  }

  /**
   * Cancel every scheduled class between two dates (inclusive) for the given
   * courses — a holiday, break, or exam week. Any class that already has a
   * session (present/absent/cancelled/planned) is left untouched; only
   * scheduled classes with nothing recorded yet get a fresh cancelled session.
   * A day that meets twice loses both, one session each.
   * Returns the number of classes cancelled.
   */
  async function markBreak(
    courses: Course[],
    startKey: string,
    endKey: string
  ): Promise<number> {
    let count = 0;
    for (const course of courses) {
      // Clamp the break to the course's own schedule window.
      const cStart = course.start_date ?? startKey;
      const cEnd = course.end_date ?? endKey;
      const rangeStart = fromDateKey(startKey > cStart ? startKey : cStart);
      const rangeEnd = fromDateKey(endKey < cEnd ? endKey : cEnd);
      if (rangeStart > rangeEnd) continue;
      for (const cls of expectedClassesInRange(course, rangeStart, rangeEnd)) {
        // Leave anything already recorded (present/absent/cancelled) untouched.
        const existing = await findSessionForDate(course.id, cls.date, cls.slot);
        if (existing) continue;
        await saveSession({
          course_id: course.id,
          scheduled_date: cls.date,
          slot: cls.slot,
          status: 'cancelled',
        });
        count += 1;
      }
    }
    invalidate();
    return count;
  }

  async function deleteSession(id: string): Promise<void> {
    const session = await db.sessions.get(id);
    if (!session) return;
    await syncEngine.softDelete('sessions', session);
    invalidate();
  }

  return { saveSession, markSession, markBreak, deleteSession };
}
