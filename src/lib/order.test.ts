import { describe, expect, it } from 'vitest';
import {
  hasExplicitOrder,
  moveBy,
  nextPosition,
  positionOf,
  reorderPlan,
  sortCourses,
} from './order';
import { makeCourse } from './test-factories';
import type { Course } from '../types';

/** A class with a name, a place, and a creation date, which is all order needs. */
function course(
  name: string,
  position: number | null,
  createdDay = 1
): Course {
  return makeCourse({
    id: name,
    name,
    position,
    created_at: `2026-09-${String(createdDay).padStart(2, '0')}T09:00:00.000Z`,
  });
}

describe('sortCourses', () => {
  it('leaves a list nobody has arranged exactly as it always read', () => {
    // Oldest first, which is the order the app used before arranging existed.
    const list = [course('c', null, 3), course('a', null, 1), course('b', null, 2)];
    expect(sortCourses(list).map((c) => c.name)).toEqual(['a', 'b', 'c']);
  });

  it('reads the arranged order once there is one', () => {
    const list = [course('a', 2), course('b', 0), course('c', 1)];
    expect(sortCourses(list).map((c) => c.name)).toEqual(['b', 'c', 'a']);
  });

  it('puts a class that has never been arranged after the ones that have', () => {
    // A class added on another device, by a build that does not know about
    // arranging, lands at the end rather than at the top.
    const list = [course('new', null, 9), course('a', 0), course('b', 1)];
    expect(sortCourses(list).map((c) => c.name)).toEqual(['a', 'b', 'new']);
  });

  it('settles a tie by creation, so the answer never depends on the read', () => {
    const list = [course('later', 0, 5), course('earlier', 0, 2)];
    expect(sortCourses(list).map((c) => c.name)).toEqual(['earlier', 'later']);
  });

  it('does not disturb the list it was given', () => {
    const list = [course('b', 1), course('a', 0)];
    sortCourses(list);
    expect(list.map((c) => c.name)).toEqual(['b', 'a']);
  });

  it('ignores a place that is not a number', () => {
    const broken = { ...course('x', null), position: 'second' } as unknown as Course;
    expect(positionOf(broken)).toBeNull();
    expect(sortCourses([broken, course('a', 0)]).map((c) => c.name)).toEqual([
      'a',
      'x',
    ]);
  });
});

describe('nextPosition', () => {
  it('puts a new class after everything already arranged', () => {
    expect(nextPosition([course('a', 0), course('b', 3)])).toBe(4);
  });

  it('starts at the beginning when nothing has been arranged', () => {
    expect(nextPosition([course('a', null)])).toBe(0);
    expect(nextPosition([])).toBe(0);
  });
});

describe('hasExplicitOrder', () => {
  it('knows whether anybody has arranged anything yet', () => {
    expect(hasExplicitOrder([course('a', null), course('b', null)])).toBe(false);
    expect(hasExplicitOrder([course('a', null), course('b', 1)])).toBe(true);
  });
});

describe('reorderPlan', () => {
  it('hands out places on the first arrange without anything appearing to move', () => {
    // Nothing has a place yet. Keeping the order it already reads in means the
    // list looks identical afterwards, and is now explicit.
    const all = [course('a', null, 1), course('b', null, 2), course('c', null, 3)];
    expect(reorderPlan(all, ['a', 'b', 'c'])).toEqual([
      { id: 'a', position: 0 },
      { id: 'b', position: 1 },
      { id: 'c', position: 2 },
    ]);
  });

  it('writes only the classes that actually moved', () => {
    const all = [course('a', 0), course('b', 1), course('c', 2), course('d', 3)];
    // b and c swap; a and d are untouched, so they are not written.
    expect(reorderPlan(all, ['a', 'c', 'b', 'd'])).toEqual([
      { id: 'c', position: 1 },
      { id: 'b', position: 2 },
    ]);
  });

  it('has nothing to write when the order did not change', () => {
    const all = [course('a', 0), course('b', 1)];
    expect(reorderPlan(all, ['a', 'b'])).toEqual([]);
  });

  it('leaves the classes a filter is hiding exactly where they were', () => {
    // Viewing one semester: only a and c are on screen, b belongs to another
    // and sits between them. Swapping a and c must not move b.
    const all = [course('a', 0), course('b', 1), course('c', 2)];
    const changes = reorderPlan(all, ['c', 'a']);
    expect(changes).toEqual([
      { id: 'c', position: 0 },
      { id: 'a', position: 2 },
    ]);
    // b keeps its place, and so still sits between them.
    const after = sortCourses([
      course('a', 2),
      course('b', 1),
      course('c', 0),
    ]);
    expect(after.map((c) => c.name)).toEqual(['c', 'b', 'a']);
  });

  it('gives a filtered arrange its neighbours\' places, not 0..n', () => {
    // The visible pair sits at the end of a longer list. Arranging them must
    // not drag them to the front of everything.
    const all = [
      course('x', 0),
      course('y', 1),
      course('a', 2),
      course('b', 3),
    ];
    expect(reorderPlan(all, ['b', 'a'])).toEqual([
      { id: 'b', position: 2 },
      { id: 'a', position: 3 },
    ]);
  });

  it('ignores an id that is not a live class', () => {
    const all = [course('a', 0), course('b', 1)];
    expect(reorderPlan(all, ['b', 'ghost', 'a'])).toEqual([
      { id: 'b', position: 0 },
      { id: 'a', position: 1 },
    ]);
  });

  it('tidies duplicate places, which two devices can both write', () => {
    const all = [course('a', 0, 1), course('b', 0, 2), course('c', 0, 3)];
    expect(reorderPlan(all, ['a', 'b', 'c'])).toEqual([
      { id: 'b', position: 1 },
      { id: 'c', position: 2 },
    ]);
  });
});

describe('moveBy', () => {
  it('moves one class up or down the list', () => {
    expect(moveBy(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b']);
    expect(moveBy(['a', 'b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c']);
  });

  it('stays put at either end rather than wrapping around', () => {
    expect(moveBy(['a', 'b'], 'a', -1)).toEqual(['a', 'b']);
    expect(moveBy(['a', 'b'], 'b', 1)).toEqual(['a', 'b']);
  });

  it('does nothing for a class that is not in the list', () => {
    expect(moveBy(['a', 'b'], 'z', 1)).toEqual(['a', 'b']);
  });
});
