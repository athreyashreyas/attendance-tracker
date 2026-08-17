import type { Course, Semester } from '../types';

/**
 * Archiving hides a class or semester from the places that are about what's
 * happening now — the dashboard, the calendar, the marking deck — without
 * touching a single attendance record. Everything stays readable in the
 * archive, and can be pulled back out at any time.
 *
 * A record carries `archived_at` once archived, and `auto_archive` decides
 * whether the app may file it away on its own after its last date. Pulling
 * something out of the archive clears that flag, so the user's choice isn't
 * quietly undone the next time the app opens.
 */

/** Rows written before the archive columns existed have neither field. */
export function isArchivedRecord(record: Course | Semester): boolean {
  return !!record.archived_at;
}

/** The last date a class runs: its own, or the semester's when it has none. */
export function effectiveEnd(
  course: Course,
  semester: Semester | null
): string | null {
  return course.end_date ?? semester?.end_date ?? null;
}

/**
 * A class counts as archived in its own right, or by belonging to a semester
 * that's been archived. Inheriting it this way means archiving a semester
 * doesn't have to rewrite every class inside it.
 */
export function isCourseArchived(
  course: Course,
  semester: Semester | null
): boolean {
  return isArchivedRecord(course) || (!!semester && isArchivedRecord(semester));
}

/** True once the last class has been and gone. Open-ended classes never end. */
export function hasEnded(
  course: Course,
  semester: Semester | null,
  today: string
): boolean {
  const end = effectiveEnd(course, semester);
  return !!end && end < today;
}

/**
 * The terms whose classes must not be filed away on their own account, by id.
 *
 * A class inherits its archived state from its term, which is what lets
 * archiving a term take its classes with it and restoring one hand them all
 * back. Three kinds of term cover their classes:
 *
 *   - already archived, so the classes are archived by inheritance;
 *   - about to be archived by this same sweep;
 *   - pulled back out of the archive by the user.
 *
 * The last is the one that is easy to miss. Without it a restored term empties
 * itself: every class in it has an end date in the past and no archived_at of
 * its own, so the sweep files each one away individually, and the archived_at
 * it stamps on them cannot be cleared by restoring the term again.
 */
export function semestersCoveringCourses(
  semesters: Semester[],
  today: string
): Set<string> {
  const covering = new Set<string>();
  for (const s of semesters) {
    const restoredByHand = !isArchivedRecord(s) && s.auto_archive === false;
    if (
      isArchivedRecord(s) ||
      shouldAutoArchive(s, s.end_date, today) ||
      restoredByHand
    ) {
      covering.add(s.id);
    }
  }
  return covering;
}

/** Records the app may file away on its own: ended, live, and not exempted. */
export function shouldAutoArchive(
  record: Course | Semester,
  endDate: string | null,
  today: string
): boolean {
  if (isArchivedRecord(record)) return false;
  if (record.auto_archive === false) return false;
  return !!endDate && endDate < today;
}
