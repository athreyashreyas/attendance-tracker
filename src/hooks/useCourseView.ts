import { useEffect, useMemo } from 'react';
import { useAllCourses } from './useCourses';
import { useSemesters } from './useSemesters';
import { useUiStore, type ViewFilter } from '../stores/uiStore';
import { isArchivedRecord, isCourseArchived } from '../lib/archive';
import type { Course, Semester } from '../types';

export interface CourseView {
  filter: ViewFilter;
  setFilter: (filter: ViewFilter) => void;
  /** Live courses matching the current filter (sorted by creation). */
  courses: Course[];
  /** Every live course, regardless of filter. */
  allCourses: Course[];
  /** Courses in the archive, newest term first. Never in `courses`. */
  archivedCourses: Course[];
  /** Live semesters only; archived ones are offered in the archive. */
  semesters: Semester[];
  archivedSemesters: Semester[];
  isLoading: boolean;
  /** The semester a course belongs to, archived or not. */
  semesterOf: (course: Course | null | undefined) => Semester | null;
}

/**
 * Resolves the dashboard/calendar view from the persisted filter:
 *  'all' → every class, 'other' → standalone classes, else a single semester.
 */
export function useCourseView(): CourseView {
  const filter = useUiStore((s) => s.viewFilter);
  const setFilter = useUiStore((s) => s.setViewFilter);
  const { data: allCourses, isLoading: coursesLoading } = useAllCourses();
  const { data: semesters, isLoading: semLoading } = useSemesters();

  const everySemester = semesters ?? [];
  const everyCourse = allCourses ?? [];

  // Keyed on every semester, archived included, so a course can still name the
  // semester it sits in while both are in the archive.
  const semesterById = useMemo(() => {
    const map = new Map<string, Semester>();
    for (const s of everySemester) map.set(s.id, s);
    return map;
  }, [everySemester]);

  const semList = useMemo(
    () => everySemester.filter((s) => !isArchivedRecord(s)),
    [everySemester]
  );
  const archivedSemesters = useMemo(
    () => everySemester.filter(isArchivedRecord),
    [everySemester]
  );

  // A class is in the archive on its own account, or because its semester is.
  const { all, archivedCourses } = useMemo(() => {
    const live: Course[] = [];
    const filed: Course[] = [];
    for (const c of everyCourse) {
      const semester = c.semester_id
        ? (semesterById.get(c.semester_id) ?? null)
        : null;
      (isCourseArchived(c, semester) ? filed : live).push(c);
    }
    return { all: live, archivedCourses: filed };
  }, [everyCourse, semesterById]);

  // Recover if the saved filter points at a semester that was deleted or
  // archived, so the dashboard never sits on an empty view it can't leave.
  useEffect(() => {
    if (filter === 'all' || filter === 'other') return;
    if (everySemester.length > 0 && !semesterById.has(filter)) setFilter('all');
    else if (archivedSemesters.some((s) => s.id === filter)) setFilter('all');
  }, [filter, everySemester.length, semesterById, archivedSemesters, setFilter]);

  const courses = useMemo(() => {
    if (filter === 'all') return all;
    if (filter === 'other') return all.filter((c) => !c.semester_id);
    return all.filter((c) => c.semester_id === filter);
  }, [all, filter]);

  function semesterOf(course: Course | null | undefined): Semester | null {
    if (!course?.semester_id) return null;
    return semesterById.get(course.semester_id) ?? null;
  }

  return {
    filter,
    setFilter,
    courses,
    allCourses: all,
    archivedCourses,
    semesters: semList,
    archivedSemesters,
    isLoading: coursesLoading || semLoading,
    semesterOf,
  };
}
