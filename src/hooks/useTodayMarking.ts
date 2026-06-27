import { useMemo } from 'react';
import { useAllCourses } from './useCourses';
import { useAllSessions } from './useSessions';
import { todayKey } from '../utils/dates';
import type { Course, ScheduleDay, Session } from '../types';

export interface TodayMarking {
  /** Today's full deck: every class on today (a recurring day or an ad-hoc
   *  session already placed on today), regardless of the active view filter. */
  deck: Course[];
  /** Decided sessions on today (present/absent/cancelled), keyed by course id.
   *  A 'planned' session still counts as unmarked, so it's excluded here. */
  markedToday: Map<string, Session>;
  /** Deck classes that still need a present/absent/cancelled today. */
  toMark: Course[];
  /** True until both courses and sessions have loaded from Dexie. */
  isLoading: boolean;
}

/**
 * Single source of truth for "what is there to mark today", shared by the
 * dashboard banner and the Mark deck. Reads the user's full course/session set
 * so it stays correct no matter which semester is in view.
 */
export function useTodayMarking(): TodayMarking {
  const { data: courses, isLoading: coursesLoading } = useAllCourses();
  const { data: allSessions, isLoading: sessionsLoading } = useAllSessions();

  const today = todayKey();
  const todayDow = new Date().getDay() as ScheduleDay;

  return useMemo(() => {
    const sessions = allSessions ?? [];

    // Course ids with any session on today (used to pull ad-hoc classes into
    // the deck even when today isn't one of their recurring days).
    const withSessionToday = new Set<string>();
    const markedToday = new Map<string, Session>();
    for (const s of sessions) {
      if (s.scheduled_date !== today) continue;
      withSessionToday.add(s.course_id);
      if (s.status !== 'planned') markedToday.set(s.course_id, s);
    }

    const deck = (courses ?? []).filter(
      (c) => c.schedule_days.includes(todayDow) || withSessionToday.has(c.id)
    );
    const toMark = deck.filter((c) => !markedToday.has(c.id));

    return {
      deck,
      markedToday,
      toMark,
      isLoading: coursesLoading || sessionsLoading,
    };
  }, [courses, allSessions, today, todayDow, coursesLoading, sessionsLoading]);
}
