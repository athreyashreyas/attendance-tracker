import type { Session, AttendanceStats, Course, ScheduleDay } from '../types';

/**
 * Core attendance percentage and threshold calculations.
 * Cancelled sessions are excluded from all totals.
 */
export function computeAttendanceStats(
  course: Course,
  sessions: Session[]
): AttendanceStats {
  const active = sessions.filter((s) => s.status !== 'cancelled' && !s.deleted_at);
  const present = active.filter((s) => s.status === 'present').length;
  const absent = active.filter((s) => s.status === 'absent').length;
  const cancelled = sessions.filter(
    (s) => s.status === 'cancelled' && !s.deleted_at
  ).length;
  const total = active.length;
  const threshold = course.min_attendance_pct;
  const t = threshold / 100;
  const pct = total > 0 ? (present / total) * 100 : 0;

  // How many more sessions can be missed while staying >= threshold?
  // Derived from: present / (total + n) >= t  =>  n = floor(present / t - total)
  let canMissMore = 0;
  if (total > 0 && t > 0) {
    canMissMore = Math.floor(present / t - total);
  } else if (total > 0 && t === 0) {
    canMissMore = Number.POSITIVE_INFINITY;
  }

  // How many consecutive attendances needed to reach threshold from below?
  // Derived from: (present + m) / (total + m) >= t
  //   m = ceil((t * total - present) / (1 - t))
  let needToAttend = 0;
  if (pct < threshold) {
    const denom = 1 - t;
    needToAttend =
      denom > 0
        ? Math.ceil((t * total - present) / denom)
        : Number.POSITIVE_INFINITY; // threshold = 100%, any absence is unrecoverable
  }

  return {
    courseId: course.id,
    total,
    present,
    absent,
    cancelled,
    percentage: Math.round(pct * 10) / 10,
    threshold,
    canMissMore: Math.max(canMissMore, 0),
    needToAttend,
    isAtRisk: total > 0 && pct < threshold,
  };
}

/**
 * Generate expected session dates for a course between two dates,
 * based on its schedule_days array.
 */
export function generateExpectedDates(
  course: Course,
  startDate: Date,
  endDate: Date
): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (current <= end) {
    if (course.schedule_days.includes(current.getDay() as ScheduleDay)) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
