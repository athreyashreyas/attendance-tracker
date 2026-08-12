import { useMemo } from 'react';
import { useAllCourses } from './useCourses';
import { useAllSessions } from './useSessions';
import { useSemesters } from './useSemesters';
import { classesOnDate, isWithinTerm } from '../lib/calculations';
import { slotOf } from '../lib/slots';
import { isCourseArchived } from '../lib/archive';
import { todayKey } from '../utils/dates';
import type { Course, Session } from '../types';

/** One class of today: a course, and which of its classes today this is. */
export interface TodayClass {
  /** Stable identity for lists and lookups: "courseId|slot". */
  key: string;
  course: Course;
  slot: number;
  /** Classes this course holds today, so a slot can be named "2nd of 2". */
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
  const { data: allSessions, isLoading: sessionsLoading } = useAllSessions();
  const { data: semesters } = useSemesters();

  const today = todayKey();

  return useMemo(() => {
    const sessions = allSessions ?? [];
    const semesterById = new Map((semesters ?? []).map((s) => [s.id, s]));

    // Sessions already sitting on today, by course. These pull an ad-hoc class
    // into the deck even when today isn't one of its recurring days, and an
    // extra lecture added by hand past the scheduled count.
    const slotsToday = new Map<string, Set<number>>();
    const decided = new Map<string, Session>();
    for (const s of sessions) {
      if (s.scheduled_date !== today) continue;
      const slot = slotOf(s);
      const slots = slotsToday.get(s.course_id) ?? new Set<number>();
      slots.add(slot);
      slotsToday.set(s.course_id, slots);
      if (s.status !== 'planned') decided.set(`${s.course_id}|${slot}`, s);
    }

    // A class the user has marked as off today isn't asked about, unless they've
    // already put a session on today themselves. Archived classes never appear:
    // they're done with, whatever their schedule says.
    const deck: TodayClass[] = [];
    for (const course of courses ?? []) {
      const semester = course.semester_id
        ? (semesterById.get(course.semester_id) ?? null)
        : null;
      if (isCourseArchived(course, semester)) continue;
      const placed = slotsToday.get(course.id) ?? new Set<number>();
      // A class that hasn't started, or has finished, holds nothing today
      // whatever its weekdays say. It can still be asked about when a session
      // has been placed on today by hand.
      const scheduled = isWithinTerm(course, semester, today)
        ? classesOnDate(course, today)
        : 0;
      const highest = Math.max(scheduled, ...placed, 0);
      // Slots between the scheduled ones and a hand-placed extra don't exist
      // (deleting the middle class of three leaves such a gap), so the deck
      // skips them rather than asking about a class that isn't there.
      const slots: number[] = [];
      for (let slot = 1; slot <= highest; slot++) {
        if (slot <= scheduled || placed.has(slot)) slots.push(slot);
      }
      for (const slot of slots) {
        deck.push({ key: `${course.id}|${slot}`, course, slot, total: highest });
      }
    }

    const markedToday = new Map<string, Session>();
    for (const item of deck) {
      const session = decided.get(item.key);
      if (session) markedToday.set(item.key, session);
    }
    const toMark = deck.filter((item) => !markedToday.has(item.key));

    return {
      deck,
      markedToday,
      toMark,
      isLoading: coursesLoading || sessionsLoading,
    };
  }, [courses, allSessions, semesters, today, coursesLoading, sessionsLoading]);
}
