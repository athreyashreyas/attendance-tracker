import { describe, expect, it } from 'vitest';
import {
  effectiveEnd,
  hasEnded,
  isArchivedRecord,
  isCourseArchived,
  semestersCoveringCourses,
  shouldAutoArchive,
} from './archive';
import { makeCourse, makeSemester } from './test-factories';

const ARCHIVED_AT = '2026-08-01T09:00:00.000Z';

describe('isCourseArchived', () => {
  it('is archived on its own account', () => {
    expect(isCourseArchived(makeCourse({ archived_at: ARCHIVED_AT }), null)).toBe(true);
  });

  it('is archived by belonging to a term that is', () => {
    // Inheritance rather than rewriting each class is what lets restoring a
    // term hand every class back at once.
    const semester = makeSemester({ archived_at: ARCHIVED_AT });
    expect(isCourseArchived(makeCourse(), semester)).toBe(true);
  });

  it('stays live while both it and its term are', () => {
    expect(isCourseArchived(makeCourse(), makeSemester())).toBe(false);
    expect(isArchivedRecord(makeCourse())).toBe(false);
  });
});

describe('effectiveEnd / hasEnded', () => {
  it('takes the class end date, then the term, then nothing', () => {
    const semester = makeSemester({ end_date: '2026-12-18' });
    expect(effectiveEnd(makeCourse({ end_date: '2026-11-30' }), semester)).toBe(
      '2026-11-30'
    );
    expect(effectiveEnd(makeCourse(), semester)).toBe('2026-12-18');
    expect(effectiveEnd(makeCourse(), null)).toBeNull();
  });

  it('never ends an open-ended class', () => {
    expect(hasEnded(makeCourse(), null, '2030-01-01')).toBe(false);
  });

  it('ends the day after the last class, not on it', () => {
    const course = makeCourse({ end_date: '2026-12-18' });
    expect(hasEnded(course, null, '2026-12-18')).toBe(false);
    expect(hasEnded(course, null, '2026-12-19')).toBe(true);
  });
});

describe('shouldAutoArchive', () => {
  const today = '2026-12-19';

  it('files away a class whose last date has passed', () => {
    expect(shouldAutoArchive(makeCourse(), '2026-12-18', today)).toBe(true);
  });

  it('leaves alone anything still running, or with no end in sight', () => {
    expect(shouldAutoArchive(makeCourse(), '2026-12-19', today)).toBe(false);
    expect(shouldAutoArchive(makeCourse(), null, today)).toBe(false);
  });

  it('never touches what is already in the archive', () => {
    const archived = makeCourse({ archived_at: ARCHIVED_AT });
    expect(shouldAutoArchive(archived, '2026-12-18', today)).toBe(false);
  });

  it('respects a class pulled back out by hand', () => {
    // Restoring clears auto_archive, so the sweep cannot undo the choice.
    const restored = makeCourse({ auto_archive: false });
    expect(shouldAutoArchive(restored, '2026-12-18', today)).toBe(false);
  });
});

describe('semestersCoveringCourses', () => {
  const today = '2026-08-17';

  it('covers the classes of a term the user pulled back out of the archive', () => {
    // Without this the term empties itself on the next sweep, and each class
    // gets an archived_at that restoring the term again cannot clear.
    const restored = makeSemester({
      id: 'term-1',
      end_date: '2026-06-30', // already over
      archived_at: null,
      auto_archive: false, // the mark left by restoring it
    });
    expect(semestersCoveringCourses([restored], today).has('term-1')).toBe(true);
  });

  it('still lets a class in a live term archive on its own when it ends early', () => {
    const live = makeSemester({
      id: 'term-2',
      end_date: '2026-12-31', // still running
      archived_at: null,
      auto_archive: true,
    });
    expect(semestersCoveringCourses([live], today).has('term-2')).toBe(false);
  });

  it('covers an archived term and one this sweep is about to archive', () => {
    const archived = makeSemester({ id: 'a', archived_at: ARCHIVED_AT });
    const ending = makeSemester({
      id: 'b',
      end_date: '2026-06-30',
      archived_at: null,
      auto_archive: true,
    });
    const covered = semestersCoveringCourses([archived, ending], today);
    expect(covered.has('a')).toBe(true);
    expect(covered.has('b')).toBe(true);
  });
});
