import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { syncEngine } from '../lib/sync';
import { useAuthStore } from '../stores/authStore';
import { toRemote } from '../utils/records';
import { nowIso } from '../utils/dates';
import { scheduleFields } from '../lib/schedule';
import type {
  ClassesPerDay,
  Course,
  ScheduleDay,
  SchedulePeriod,
} from '../types';

async function loadAllCourses(): Promise<Course[]> {
  const courses = await db.courses.filter((c) => !c.deleted_at).toArray();
  return courses.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/**
 * Every non-deleted course for the signed-in user. Views (a semester, standalone,
 * or all) are derived from this in memory — Dexie can't query a null index, and
 * course counts are small.
 */
export function useAllCourses() {
  return useQuery({ queryKey: ['courses'], queryFn: loadAllCourses });
}

export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => (await db.courses.get(courseId as string)) ?? null,
    enabled: !!courseId,
  });
}

export interface CourseInput {
  id?: string;
  semester_id: string | null;
  name: string;
  color: string;
  schedule_days: ScheduleDay[];
  sessions_per_day?: ClassesPerDay;
  /**
   * The class's timetable over time. Left out by a caller that has only one
   * timetable to give, which is then the whole timeline.
   */
  schedule_history?: SchedulePeriod[];
  min_attendance_pct: number;
  start_date?: string | null;
  end_date?: string | null;
  excluded_dates?: string[];
}

export function useCourseMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['courses'] });
    void queryClient.invalidateQueries({ queryKey: ['course'] });
  };

  async function saveCourse(input: CourseInput): Promise<Course> {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    const existing = input.id ? await db.courses.get(input.id) : undefined;
    const now = nowIso();
    // The timeline is the truth; schedule_days and sessions_per_day mirror its
    // newest entry, so a build of the app that predates the timeline still
    // reads and shows the timetable the class is running now.
    const schedule = scheduleFields(
      input.schedule_days,
      input.sessions_per_day,
      input.schedule_history
    );
    const course: Course = {
      id: input.id ?? crypto.randomUUID(),
      user_id: userId,
      semester_id: input.semester_id ?? null,
      name: input.name.trim(),
      color: input.color,
      ...schedule,
      min_attendance_pct: input.min_attendance_pct,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      // Kept sorted so the stored order never depends on the order they were tapped.
      excluded_dates: [...(input.excluded_dates ?? [])].sort(),
      archived_at: existing?.archived_at ?? null,
      auto_archive: existing?.auto_archive ?? true,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      deleted_at: null,
    };
    await syncEngine.writeLocal('courses', input.id ? 'UPDATE' : 'INSERT', course);
    invalidate();
    return course;
  }

  /**
   * File a class away (or pull it back out). Nothing is deleted: the class and
   * every session it holds stay exactly as they are, just out of the way.
   * Unarchiving also stops the app auto-archiving it again on the next launch.
   */
  async function setCourseArchived(id: string, archived: boolean): Promise<void> {
    const course = await db.courses.get(id);
    if (!course) return;
    const now = nowIso();
    await syncEngine.writeLocal('courses', 'UPDATE', {
      ...toRemote(course),
      archived_at: archived ? now : null,
      // Pulling a class back out means "keep this visible", so the app stops
      // filing it away on its own.
      auto_archive: archived ? (course.auto_archive ?? true) : false,
      updated_at: now,
    } as Course);
    invalidate();
  }

  async function deleteCourse(id: string): Promise<void> {
    const course = await db.courses.get(id);
    if (!course) return;
    // Soft-delete the course and all of its sessions.
    const sessions = await db.sessions
      .where('course_id')
      .equals(id)
      .filter((s) => !s.deleted_at)
      .toArray();
    for (const s of sessions) {
      await syncEngine.softDelete('sessions', s);
    }
    await syncEngine.softDelete('courses', course);
    invalidate();
    void queryClient.invalidateQueries({ queryKey: ['sessions'] });
  }

  return { saveCourse, setCourseArchived, deleteCourse };
}
