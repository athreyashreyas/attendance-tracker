import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { syncEngine } from '../lib/sync';
import { db } from '../lib/db';
import { toRemote } from '../utils/records';
import { nowIso, todayKey } from '../utils/dates';
import { isArchivedRecord, shouldAutoArchive } from '../lib/archive';
import { useAllCourses } from './useCourses';
import { useSemesters } from './useSemesters';
import type { Course, Semester } from '../types';

/**
 * Files away anything whose last date has passed: a semester past its end, and
 * any class past its own end (or its semester's, when it has none of its own).
 *
 * It works off local data, so it runs offline and its writes sync like any
 * other edit. Classes with no end date never end, so they're never touched,
 * and anything pulled back out of the archive by hand is left alone.
 *
 * The pass is idempotent: once a record carries `archived_at` it no longer
 * qualifies, so re-running after a sync (or after the day rolls over) writes
 * nothing and settles immediately.
 */
export function useAutoArchive(): void {
  const queryClient = useQueryClient();
  const { data: courses } = useAllCourses();
  const { data: semesters } = useSemesters();
  const running = useRef(false);

  useEffect(() => {
    if (!courses || !semesters) return;
    if (running.current) return;

    const today = todayKey();
    const semesterById = new Map(semesters.map((s) => [s.id, s]));

    const staleSemesters = semesters.filter((s) =>
      shouldAutoArchive(s, s.end_date, today)
    );

    // Classes in a term that is (or is about to be) archived are covered by the
    // term itself. Leaving their own flag alone is what lets restoring a term
    // hand every one of its classes back, while a class the user archived early
    // keeps its own mark and stays put.
    const coveredBySemester = new Set([
      ...semesters.filter(isArchivedRecord).map((s) => s.id),
      ...staleSemesters.map((s) => s.id),
    ]);

    const staleCourses = courses.filter((c) => {
      if (c.semester_id && coveredBySemester.has(c.semester_id)) return false;
      // A class with no end date of its own borrows its semester's.
      const semester = c.semester_id
        ? (semesterById.get(c.semester_id) ?? null)
        : null;
      return shouldAutoArchive(c, c.end_date ?? semester?.end_date ?? null, today);
    });

    if (staleSemesters.length === 0 && staleCourses.length === 0) return;

    running.current = true;
    void (async () => {
      try {
        const now = nowIso();
        for (const s of staleSemesters) {
          // Re-read so a concurrent edit isn't overwritten with a stale copy.
          const row = await db.semesters.get(s.id);
          if (!row || row.deleted_at || row.archived_at) continue;
          await syncEngine.writeLocal('semesters', 'UPDATE', {
            ...toRemote(row),
            archived_at: now,
            updated_at: now,
          } as Semester);
        }
        for (const c of staleCourses) {
          const row = await db.courses.get(c.id);
          if (!row || row.deleted_at || row.archived_at) continue;
          await syncEngine.writeLocal('courses', 'UPDATE', {
            ...toRemote(row),
            archived_at: now,
            updated_at: now,
          } as Course);
        }
        void queryClient.invalidateQueries({ queryKey: ['courses'] });
        void queryClient.invalidateQueries({ queryKey: ['course'] });
        void queryClient.invalidateQueries({ queryKey: ['semesters'] });
      } finally {
        running.current = false;
      }
    })();
  }, [courses, semesters, queryClient]);
}
