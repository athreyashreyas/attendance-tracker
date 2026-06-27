import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { syncEngine } from '../lib/sync';
import { useAuthStore } from '../stores/authStore';
import { nowIso } from '../utils/dates';
import type { Course, ScheduleDay } from '../types';

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
  min_attendance_pct: number;
  start_date?: string | null;
  end_date?: string | null;
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
    const course: Course = {
      id: input.id ?? crypto.randomUUID(),
      user_id: userId,
      semester_id: input.semester_id ?? null,
      name: input.name.trim(),
      color: input.color,
      schedule_days: input.schedule_days,
      min_attendance_pct: input.min_attendance_pct,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      deleted_at: null,
    };
    await syncEngine.writeLocal('courses', input.id ? 'UPDATE' : 'INSERT', course);
    invalidate();
    return course;
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

  return { saveCourse, deleteCourse };
}
