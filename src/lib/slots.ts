import type { Course, ScheduleDay, Session } from '../types';

/**
 * A weekday can hold more than one class: a double lecture, a lab that runs two
 * periods back to back, a tutorial straight after the theory hour. Each of those
 * is its own class with its own attendance, so they're numbered within the day —
 * that number is the slot, counting from 1.
 *
 * Everything here tolerates rows written before slots existed: a session with no
 * slot is the first class of its day, and a course with no per-day counts meets
 * once on each of its days.
 */

/** Beyond this a day stops being a timetable and starts being a mistake. */
export const MAX_CLASSES_PER_DAY = 6;

/** Which class of its day a session records. Older rows carry no slot. */
export function slotOf(session: Session): number {
  const n = Math.floor(Number(session.slot));
  return Number.isFinite(n) && n > 1 ? n : 1;
}

/** Clamp a hand-entered count to something a day could actually hold. */
export function normalizeCount(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 1) return 1;
  return Math.min(n, MAX_CLASSES_PER_DAY);
}

/**
 * How many classes this course holds on a given weekday: 0 when it doesn't meet
 * that day at all. Days off aren't considered here — see classesOnDate.
 */
export function classesOnWeekday(course: Course, day: ScheduleDay): number {
  if (!course.schedule_days.includes(day)) return 0;
  return normalizeCount(course.sessions_per_day?.[day] ?? 1);
}

/** "1st", "2nd", "3rd"… for naming one class within its day. */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * How to name one class of a day in the UI, or null when the day holds a single
 * class and there's nothing to distinguish.
 */
export function slotLabel(slot: number, total: number): string | null {
  if (total <= 1 && slot <= 1) return null;
  return total > 1 ? `${ordinal(slot)} of ${total}` : ordinal(slot);
}
