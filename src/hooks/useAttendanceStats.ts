import { useMemo } from 'react';
import {
  computeAttendanceStats,
  computeTermProjection,
} from '../lib/calculations';
import { useSessions } from './useSessions';
import { todayKey } from '../utils/dates';
import type { AttendanceStats, Course, Semester, TermProjection } from '../types';

/**
 * Compute live attendance stats for a course by reading its sessions from Dexie.
 * Returns null until the course is available.
 */
export function useAttendanceStats(
  course: Course | null | undefined
): AttendanceStats | null {
  const { data: sessions } = useSessions(course?.id);

  return useMemo(() => {
    if (!course) return null;
    return computeAttendanceStats(course, sessions ?? []);
  }, [course, sessions]);
}

/**
 * Project the course's attendance across the term (classes still to come).
 * Bounds come from the course's own dates, falling back to its semester when
 * linked. Returns null when there's no end date to project toward (e.g. an
 * open-ended standalone class) — the UI then shows running stats instead.
 */
export function useTermProjection(
  course: Course | null | undefined,
  semester: Semester | null | undefined
): TermProjection | null {
  const { data: sessions } = useSessions(course?.id);

  return useMemo(() => {
    if (!course) return null;
    const start = course.start_date ?? semester?.start_date ?? null;
    const end = course.end_date ?? semester?.end_date ?? null;
    if (!start || !end) return null;
    return computeTermProjection(course, sessions ?? [], start, end, todayKey());
  }, [course, semester, sessions]);
}
