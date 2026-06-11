import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { syncEngine } from '../lib/sync';
import { useAuthStore } from '../stores/authStore';
import { nowIso } from '../utils/dates';
import { toRemote } from '../utils/records';
import type { Course, ScheduleDay } from '../types';

async function loadCourses(semesterId: string): Promise<Course[]> {
  const courses = await db.courses
    .where('semester_id')
    .equals(semesterId)
    .filter((c) => !c.deleted_at)
    .toArray();
  return courses.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function useCourses(semesterId: string | null | undefined) {
  return useQuery({
    queryKey: ['courses', semesterId],
    queryFn: () => loadCourses(semesterId as string),
    enabled: !!semesterId,
  });
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
  semester_id: string;
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
      semester_id: input.semester_id,
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
    const now = nowIso();
    // Soft-delete the course and all of its sessions.
    const sessions = await db.sessions
      .where('course_id')
      .equals(id)
      .filter((s) => !s.deleted_at)
      .toArray();
    for (const s of sessions) {
      await syncEngine.writeLocal('sessions', 'DELETE', {
        ...toRemote(s),
        deleted_at: now,
        updated_at: now,
      });
    }
    await syncEngine.writeLocal('courses', 'DELETE', {
      ...toRemote(course),
      deleted_at: now,
      updated_at: now,
    });
    invalidate();
    void queryClient.invalidateQueries({ queryKey: ['sessions'] });
  }

  return { saveCourse, deleteCourse };
}
