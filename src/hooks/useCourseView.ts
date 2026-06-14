import { useEffect, useMemo } from 'react';
import { useAllCourses } from './useCourses';
import { useSemesters } from './useSemesters';
import { useUiStore, type ViewFilter } from '../stores/uiStore';
import type { Course, Semester } from '../types';

export interface CourseView {
  filter: ViewFilter;
  setFilter: (filter: ViewFilter) => void;
  /** Courses matching the current filter (sorted by creation). */
  courses: Course[];
  /** All of the user's courses, regardless of filter. */
  allCourses: Course[];
  semesters: Semester[];
  isLoading: boolean;
  /** The semester a course belongs to, or null if it's standalone. */
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

  const semList = semesters ?? [];
  const all = allCourses ?? [];

  const semesterById = useMemo(() => {
    const map = new Map<string, Semester>();
    for (const s of semList) map.set(s.id, s);
    return map;
  }, [semList]);

  // Recover if the saved filter points at a semester that was deleted.
  useEffect(() => {
    if (filter === 'all' || filter === 'other') return;
    if (semList.length > 0 && !semesterById.has(filter)) setFilter('all');
  }, [filter, semList.length, semesterById, setFilter]);

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
    semesters: semList,
    isLoading: coursesLoading || semLoading,
    semesterOf,
  };
}
