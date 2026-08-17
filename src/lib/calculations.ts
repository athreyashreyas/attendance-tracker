import type {
  Session,
  AttendanceStats,
  ClassesPerDay,
  Course,
  ScheduleDay,
  Semester,
  TermProjection,
} from '../types';
import { format } from 'date-fns';
import { classesOnWeekday, normalizeCount, slotOf } from './slots';

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
    // The epsilon absorbs float noise (e.g. 3/0.6 === 4.999999999999999) so an
    // exactly-on-threshold count doesn't floor one class too low.
    canMissMore = Math.floor(present / t - total + 1e-9);
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
        ? Math.ceil((t * total - present) / denom - 1e-9)
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

  // Classes already settled (present/absent/cancelled) shouldn't be counted as
  // "still to come". A day that meets twice settles one class at a time, so
  // these are counted by date and slot rather than by date alone.
  const decidedKeys = new Set(
    decided.map((s) => `${s.scheduled_date}|${slotOf(s)}`)
  );

  // Future scheduled classes with nothing recorded yet.
  const expected = expandToClasses(
    course,
    generateExpectedDates(
      course,
      new Date(`${termStart}T00:00:00`),
      new Date(`${termEnd}T00:00:00`)
    )
  );
  const expectedKeys = new Set(expected.map((e) => `${e.date}|${e.slot}`));
  let remaining = 0;
  for (const e of expected) {
    if (e.date >= today && !decidedKeys.has(`${e.date}|${e.slot}`)) remaining += 1;
  }
  // Ad-hoc planned classes in the future that aren't already on the recurring
  // schedule also count as classes still to come.
  for (const s of live) {
    if (
      s.status === 'planned' &&
      s.scheduled_date >= today &&
      !expectedKeys.has(`${s.scheduled_date}|${slotOf(s)}`)
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
 * Days the course has been told it doesn't meet (holidays, breaks). Older rows
 * synced before the column existed have no array at all, hence the fallback.
 */
export function daysOff(course: Course): string[] {
  return course.excluded_dates ?? [];
}

/** True when the class is explicitly off on this date. */
export function isDayOff(course: Course, dateKey: string): boolean {
  return daysOff(course).includes(dateKey);
}

/**
 * How many classes this course holds on a particular date: none when the date
 * isn't one of its days or has been taken off, otherwise however many that
 * weekday holds. A day off takes the whole day, both halves of a double.
 */
export function classesOnDate(course: Course, dateKey: string): number {
  if (isDayOff(course, dateKey)) return 0;
  const day = new Date(`${dateKey}T00:00:00`).getDay() as ScheduleDay;
  return classesOnWeekday(course, day);
}

/**
 * The dates a class runs between: its own when set, otherwise the term it
 * belongs to. Either end may be open, which an ongoing standalone class is.
 */
export function termWindow(
  course: Course,
  semester: Semester | null
): { start: string | null; end: string | null } {
  return {
    start: course.start_date ?? semester?.start_date ?? null,
    end: course.end_date ?? semester?.end_date ?? null,
  };
}

/** True when a date falls inside the class's term (open ends include everything). */
export function isWithinTerm(
  course: Course,
  semester: Semester | null,
  dateKey: string
): boolean {
  const { start, end } = termWindow(course, semester);
  if (start && dateKey < start) return false;
  if (end && dateKey > end) return false;
  return true;
}

/**
 * Whether a schedule holds a particular class of a particular day. Takes the
 * parts rather than a course, so the class form can ask it of the settings
 * being edited, before anything is saved.
 */
export function scheduleHoldsClass(
  scheduleDays: ScheduleDay[],
  perDay: ClassesPerDay,
  excluded: string[],
  dateKey: string,
  slot: number
): boolean {
  if (excluded.includes(dateKey)) return false;
  const day = new Date(`${dateKey}T00:00:00`).getDay() as ScheduleDay;
  if (!scheduleDays.includes(day)) return false;
  return slot <= normalizeCount(perDay[day] ?? 1);
}

/** One class of a particular day, recorded or not. */
export interface DayClass {
  /** Which class of the day this is, as stored on the session. */
  slot: number;
  /** What was recorded against it, or null while it's still to be marked. */
  session: Session | null;
  /** True when the schedule holds it, false for one added to the day by hand. */
  scheduled: boolean;
}

/**
 * The shape of one day for one class: the classes its schedule holds, plus any
 * recorded past them, in the order they run.
 *
 * This is the single answer to "what does this day hold", asked by the marking
 * deck, the calendar's day sheet, the overview grid and the grid's day picker.
 * Two rules it settles for all of them: a slot with neither a session nor a
 * scheduled class isn't a class at all (deleting the middle class of three
 * leaves such a gap), and a day outside the class's term holds only what has
 * actually been recorded on it.
 *
 * `sessions` is that course's live sessions on that date; anything else is
 * ignored. Pass the class's semester so a class with no dates of its own can be
 * held to its term.
 */
export function classesOnDay(
  course: Course,
  dateKey: string,
  sessions: Session[],
  semester: Semester | null = null
): DayClass[] {
  const bySlot = new Map<number, Session>();
  for (const s of sessions) {
    if (s.deleted_at) continue;
    if (s.course_id !== course.id || s.scheduled_date !== dateKey) continue;
    bySlot.set(slotOf(s), s);
  }

  const scheduled = isWithinTerm(course, semester, dateKey)
    ? classesOnDate(course, dateKey)
    : 0;
  const highest = Math.max(scheduled, ...bySlot.keys(), 0);

  const out: DayClass[] = [];
  for (let slot = 1; slot <= highest; slot++) {
    const session = bySlot.get(slot) ?? null;
    if (session || slot <= scheduled) {
      out.push({ slot, session, scheduled: slot <= scheduled });
    }
  }
  return out;
}

/** One class of one day: the date it falls on and its place within that day. */
export interface ExpectedClass {
  date: string; // 'YYYY-MM-DD'
  slot: number; // 1-based
  total: number; // classes that day, so a slot can be named "2nd of 2"
}

/** Expand a list of class dates into the individual classes they hold. */
export function expandToClasses(course: Course, dates: Date[]): ExpectedClass[] {
  const out: ExpectedClass[] = [];
  for (const d of dates) {
    const date = format(d, 'yyyy-MM-dd');
    const total = classesOnWeekday(course, d.getDay() as ScheduleDay);
    for (let slot = 1; slot <= total; slot++) out.push({ date, slot, total });
  }
  return out;
}

/**
 * The longest span these helpers will walk, a day at a time. Ten years is far
 * beyond any real class and short enough that a typo cannot lock up the tab:
 * a mistyped year like 9999 would otherwise be roughly 2.9 million iterations,
 * recomputed on every keystroke in the class form.
 *
 * Past this the range is treated as invalid rather than truncated, so nothing
 * silently reports a term it only half counted. The class form checks the same
 * bound and says so before a save gets this far.
 */
export const MAX_TERM_DAYS = 3660;

/** Whole days from one date to another, both ends local midnight. */
function spanInDays(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

/**
 * Generate expected session dates for a course between two dates, based on its
 * schedule_days array and minus its days off. Returns [] for an invalid range,
 * which includes a span longer than MAX_TERM_DAYS.
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
    course.schedule_days.length === 0 ||
    spanInDays(startDate, endDate) > MAX_TERM_DAYS
  ) {
    return dates;
  }
  const off = new Set(daysOff(course));
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (current <= end) {
    if (
      course.schedule_days.includes(current.getDay() as ScheduleDay) &&
      !off.has(format(current, 'yyyy-MM-dd'))
    ) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Count the classes a schedule actually produces between two dates, counting a
 * day that meets twice as two. Used by the class form to show the effect of days
 * off and double days while they're being picked, before anything is saved.
 */
export function countClassDays(
  scheduleDays: ScheduleDay[],
  startKey: string,
  endKey: string,
  excluded: string[],
  perDay: ClassesPerDay = {}
): number {
  if (!startKey || !endKey || endKey < startKey || scheduleDays.length === 0) {
    return 0;
  }
  const off = new Set(excluded);
  const current = new Date(`${startKey}T00:00:00`);
  const end = new Date(`${endKey}T00:00:00`);
  if (spanInDays(current, end) > MAX_TERM_DAYS) return 0;
  let count = 0;
  while (current <= end) {
    const key = format(current, 'yyyy-MM-dd');
    const day = current.getDay() as ScheduleDay;
    if (scheduleDays.includes(day) && !off.has(key)) {
      count += normalizeCount(perDay[day] ?? 1);
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Expected dates within a window, additionally clamped to the course's own
 * start/end dates when those are set. Keeps schedule expansion bounded — vital
 * for standalone classes that may have no end date of their own.
 */
export function expectedClassesInRange(
  course: Course,
  windowStart: Date,
  windowEnd: Date
): ExpectedClass[] {
  return expandToClasses(course, expectedDatesInRange(course, windowStart, windowEnd));
}

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
