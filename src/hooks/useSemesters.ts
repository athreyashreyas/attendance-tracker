import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { syncEngine } from '../lib/sync';
import { useAuthStore } from '../stores/authStore';
import { nowIso } from '../utils/dates';
import { toRemote } from '../utils/records';
import type { Semester } from '../types';

async function loadSemesters(): Promise<Semester[]> {
  const all = await db.semesters.filter((s) => !s.deleted_at).toArray();
  return all.sort((a, b) => b.start_date.localeCompare(a.start_date));
}

export function useSemesters() {
  return useQuery({ queryKey: ['semesters'], queryFn: loadSemesters });
}

export interface SemesterInput {
  id?: string;
  name: string;
  start_date: string;
  end_date: string;
}

export function useSemesterMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['semesters'] });
  };

  async function saveSemester(input: SemesterInput): Promise<Semester> {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    const existing = input.id ? await db.semesters.get(input.id) : undefined;
    const now = nowIso();
    const semester: Semester = {
      id: input.id ?? crypto.randomUUID(),
      user_id: userId,
      name: input.name.trim(),
      start_date: input.start_date,
      end_date: input.end_date,
      is_active: existing?.is_active ?? false,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      deleted_at: null,
    };
    await syncEngine.writeLocal(
      'semesters',
      input.id ? 'UPDATE' : 'INSERT',
      semester
    );
    invalidate();
    return semester;
  }

  /**
   * Returns false (and does nothing) if any class in the semester still has
   * recorded sessions — the user is asked to clear those first.
   */
  async function deleteSemester(id: string): Promise<boolean> {
    const courses = await db.courses
      .where('semester_id')
      .equals(id)
      .filter((c) => !c.deleted_at)
      .toArray();
    for (const c of courses) {
      const count = await db.sessions
        .where('course_id')
        .equals(c.id)
        .filter((s) => !s.deleted_at)
        .count();
      if (count > 0) return false;
    }

    const semester = await db.semesters.get(id);
    if (!semester) return true;

    // Soft-delete the semester and its (session-free) courses.
    for (const c of courses) {
      await syncEngine.writeLocal('courses', 'DELETE', {
        ...toRemote(c),
        deleted_at: nowIso(),
        updated_at: nowIso(),
      });
    }
    await syncEngine.writeLocal('semesters', 'DELETE', {
      ...toRemote(semester),
      deleted_at: nowIso(),
      updated_at: nowIso(),
    });
    void queryClient.invalidateQueries({ queryKey: ['courses'] });
    invalidate();
    return true;
  }

  return { saveSemester, deleteSemester };
}
