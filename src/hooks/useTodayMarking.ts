import { useMemo } from 'react';
import { useAllCourses } from './useCourses';
import { useSessionsOnDate } from './useSessions';
import { useSemesters } from './useSemesters';
import { classesOnDay } from '../lib/calculations';
import { isCourseArchived } from '../lib/archive';
import { todayKey } from '../utils/dates';
import type { Course, Session } from '../types';

/** One class of today: a course, and which of its classes today this is. */
export interface TodayClass {
  /** Stable identity for lists and lookups: "courseId|slot". */
  key: string;
  course: Course;
  slot: number;
  /** Where it comes in the day, and how many the day holds: "2nd of 2". */
  position: number;
  total: number;
}

export interface TodayMarking {
  /** Today's full deck: every class on today (a recurring one or an ad-hoc
   *  session already placed on today), regardless of the active view filter.
   *  A class that meets twice today appears twice. */
  deck: TodayClass[];
  /** Decided sessions on today (present/absent/cancelled), keyed by
   *  "courseId|slot". A 'planned' session still counts as unmarked. */
  markedToday: Map<string, Session>;
  /** Deck classes that still need a present/absent/cancelled today. */
  toMark: TodayClass[];
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
  const { data: semesters } = useSemesters();

  const today = todayKey();
  // Only today's rows are ever read below, so ask Dexie for exactly those.
  const { data: todaySessions, isLoading: sessionsLoading } = useSessionsOnDate(today);

  return useMemo(() => {
    const semesterById = new Map((semesters ?? []).map((s) => [s.id, s]));

    // Today's sessions, by course. A session already on today pulls its class
    // into the deck even when today isn't one of its recurring days.
    const todayByCourse = new Map<string, Session[]>();
    for (const s of todaySessions ?? []) {
      const list = todayByCourse.get(s.course_id) ?? [];
      list.push(s);
      todayByCourse.set(s.course_id, list);
    }

    // Archived classes never appear: they're done with, whatever their
    // schedule says. Days off and term dates are the day shape's business.
    const deck: TodayClass[] = [];
    const markedToday = new Map<string, Session>();
    for (const course of courses ?? []) {
      const semester = course.semester_id
        ? (semesterById.get(course.semester_id) ?? null)
        : null;
      if (isCourseArchived(course, semester)) continue;

      const classes = classesOnDay(
        course,
        today,
        todayByCourse.get(course.id) ?? [],
        semester
      );
      classes.forEach(({ slot, session }, i) => {
        const key = `${course.id}|${slot}`;
        deck.push({
          key,
          course,
          slot,
          position: i + 1,
          total: classes.length,
        });
        // 'planned' is a class placed on the day, not a class marked.
        if (session && session.status !== 'planned') markedToday.set(key, session);
      });
    }

    const toMark = deck.filter((item) => !markedToday.has(item.key));

    return {
      deck,
      markedToday,
      toMark,
      isLoading: coursesLoading || sessionsLoading,
    };
  }, [courses, todaySessions, semesters, today, coursesLoading, sessionsLoading]);
}
