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
 * Project the course's attendance across the whole term (classes still to come).
 * Needs the owning semester for the term's date range.
 */
export function useTermProjection(
  course: Course | null | undefined,
  semester: Semester | null | undefined
): TermProjection | null {
  const { data: sessions } = useSessions(course?.id);

  return useMemo(() => {
    if (!course || !semester) return null;
    // The course's own dates win; fall back to the semester's range.
    const start = course.start_date ?? semester.start_date;
    const end = course.end_date ?? semester.end_date;
    return computeTermProjection(course, sessions ?? [], start, end, todayKey());
  }, [course, semester, sessions]);
}
