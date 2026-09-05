import type { Course } from '../types';

/**
 * The order classes sit in.
 *
 * Attendance has no natural order. A term is not alphabetical and it is not
 * chronological: it is Monday's lecture, then the lab, then the seminar you
 * always leave until last. Only the person keeping it knows the shape, so the
 * order is theirs to set, and every list that shows classes reads it.
 *
 * A class carries `position`, counting from 0. A class that has never been
 * arranged carries null, and sorts after the arranged ones by the date it was
 * created, which is exactly the order the app used before any of this existed.
 * So a list nobody has touched looks precisely as it always did.
 *
 * The one rule worth knowing: arranging happens inside whatever view is on
 * screen, which may be a single semester, but the order is one order. Moving a
 * class within a semester shuffles it among the places that semester's classes
 * already occupy, and leaves every other class exactly where it was. See
 * reorderPlan.
 */

/** Where a class sits, or null for one that has never been arranged. */
export function positionOf(course: Course): number | null {
  const n = course.position;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/**
 * Classes in the order they should be read: arranged ones first, in their
 * order, then anything unarranged by when it was created. A tie falls back to
 * the creation date too, so the result never depends on the order Dexie
 * happened to hand the rows over.
 */
export function sortCourses<T extends Course>(courses: T[]): T[] {
  return [...courses].sort((a, b) => {
    const pa = positionOf(a);
    const pb = positionOf(b);
    if (pa !== null && pb !== null && pa !== pb) return pa - pb;
    if (pa !== null && pb === null) return -1;
    if (pa === null && pb !== null) return 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

/** True once at least one class has been given a place by hand. */
export function hasExplicitOrder(courses: Course[]): boolean {
  return courses.some((c) => positionOf(c) !== null);
}

/** The place a brand-new class takes: after everything already there. */
export function nextPosition(courses: Course[]): number {
  let max = -1;
  for (const c of courses) {
    const p = positionOf(c);
    if (p !== null && p > max) max = p;
  }
  return max + 1;
}

/** One class, and the place it should be written to. */
export interface PositionChange {
  id: string;
  position: number;
}

/**
 * What to write after somebody has arranged the classes in front of them.
 *
 * `all` is every live class; `orderedIds` is the visible ones in the order
 * they were just put into. The places are worked out from the whole list, so
 * the answer is a single order rather than one order per view:
 *
 *  - The full list is numbered 0..n-1 in its current reading order. This is
 *    also what gives a list that has never been arranged its first set of
 *    places, once, without anything appearing to move.
 *  - The visible classes hold some of those numbers. Those numbers stay where
 *    they are, and are handed out again in the new visual order.
 *
 * So arranging inside one semester never disturbs the classes of another, and
 * a class hidden by the filter keeps its place between the same neighbours.
 *
 * Only the classes whose place actually changes come back, since each one is a
 * write that has to sync, and they come back in the order they will read in.
 */
export function reorderPlan(all: Course[], orderedIds: string[]): PositionChange[] {
  const ordered = sortCourses(all);
  // The places, as the whole list currently reads.
  const place = new Map<string, number>();
  ordered.forEach((course, i) => place.set(course.id, i));

  // The slots the visible classes sit in, in ascending order. Ids that are not
  // in `all` are ignored rather than trusted.
  const visible = orderedIds.filter((id) => place.has(id));
  const slots = visible.map((id) => place.get(id) as number).sort((a, b) => a - b);

  const next = new Map(place);
  visible.forEach((id, i) => next.set(id, slots[i]));

  const changes: PositionChange[] = [];
  for (const course of ordered) {
    const position = next.get(course.id) as number;
    if (positionOf(course) !== position) changes.push({ id: course.id, position });
  }
  // First place first, so the writes read in the order the list will.
  return changes.sort((a, b) => a.position - b.position);
}

/** Move one class up or down within the list on screen, for a keyboard or a tap. */
export function moveBy(ids: string[], id: string, delta: number): string[] {
  const from = ids.indexOf(id);
  if (from < 0) return ids;
  const to = from + delta;
  if (to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}
