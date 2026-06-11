import { useMemo } from 'react';
import { computeAttendanceStats } from '../lib/calculations';
import { useSessions } from './useSessions';
import type { AttendanceStats, Course } from '../types';

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
