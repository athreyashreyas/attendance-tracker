import type {
  Session,
  AttendanceStats,
  Course,
  ScheduleDay,
  TermProjection,
} from '../types';
import { format } from 'date-fns';

/**
 * Core attendance percentage and threshold calculations.
 * Cancelled sessions are excluded from all totals.
 */
export function computeAttendanceStats(
  course: Course,
  sessions: Session[]
): AttendanceStats {
  // 'planned' sessions aren't decided yet, so they sit outside every total.
  const live = sessions.filter((s) => !s.deleted_at && s.status !== 'planned');
  const present = live.filter((s) => s.status === 'present').length;
  const absent = live.filter((s) => s.status === 'absent').length;
  const cancelled = live.filter((s) => s.status === 'cancelled').length;
  const total = present + absent;
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
 * Project attendance across the whole term, accounting for classes still to
 * come. "Remaining" = future scheduled dates (today onward, within the term)
 * that have no recorded session yet. Cancelled classes are never counted.
 */
export function computeTermProjection(
  course: Course,
  sessions: Session[],
  termStart: string,
  termEnd: string,
  today: string
): TermProjection {
  const live = sessions.filter((s) => !s.deleted_at);
  const decided = live.filter((s) => s.status !== 'planned');
  const present = decided.filter((s) => s.status === 'present').length;
  const absent = decided.filter((s) => s.status === 'absent').length;

  // Dates already settled (present/absent/cancelled) shouldn't be counted as
  // "still to come".
  const decidedDates = new Set(decided.map((s) => s.scheduled_date));

  // Future scheduled dates with nothing recorded yet.
  const expected = generateExpectedDates(
    course,
    new Date(`${termStart}T00:00:00`),
    new Date(`${termEnd}T00:00:00`)
  );
  const expectedKeys = new Set(expected.map((d) => format(d, 'yyyy-MM-dd')));
  let remaining = 0;
  for (const d of expected) {
    const key = format(d, 'yyyy-MM-dd');
    if (key >= today && !decidedDates.has(key)) remaining += 1;
  }
  // Ad-hoc planned classes in the future that aren't already on the recurring
  // schedule also count as classes still to come.
  for (const s of live) {
    if (
      s.status === 'planned' &&
      s.scheduled_date >= today &&
      !expectedKeys.has(s.scheduled_date)
    ) {
      remaining += 1;
    }
  }

  const threshold = course.min_attendance_pct;
  const projectedTotal = present + absent + remaining;
  const neededAttended = Math.ceil((threshold / 100) * projectedTotal);
  const reachable = present + remaining >= neededAttended;
  const mustAttend = reachable
    ? Math.min(Math.max(neededAttended - present, 0), remaining)
    : remaining;
  const canSkip = reachable ? remaining - mustAttend : 0;

  const bestPct =
    projectedTotal > 0
      ? Math.round(((present + remaining) / projectedTotal) * 1000) / 10
      : 0;
  const worstPct =
    projectedTotal > 0 ? Math.round((present / projectedTotal) * 1000) / 10 : 0;

  return {
    courseId: course.id,
    remaining,
    projectedTotal,
    mustAttend,
    canSkip,
    reachable,
    bestPct,
    worstPct,
  };
}

/**
 * Generate expected session dates for a course between two dates,
 * based on its schedule_days array. Returns [] for an invalid range.
 */
export function generateExpectedDates(
  course: Course,
  startDate: Date,
  endDate: Date
): Date[] {
  const dates: Date[] = [];
  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    course.schedule_days.length === 0
  ) {
    return dates;
  }
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

/**
 * Expected dates within a window, additionally clamped to the course's own
 * start/end dates when those are set. Keeps schedule expansion bounded — vital
 * for standalone classes that may have no end date of their own.
 */
export function expectedDatesInRange(
  course: Course,
  windowStart: Date,
  windowEnd: Date
): Date[] {
  let start = windowStart;
  let end = windowEnd;
  if (course.start_date) {
    const cStart = new Date(`${course.start_date}T00:00:00`);
    if (cStart > start) start = cStart;
  }
  if (course.end_date) {
    const cEnd = new Date(`${course.end_date}T00:00:00`);
    if (cEnd < end) end = cEnd;
  }
  return generateExpectedDates(course, start, end);
}
