import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { syncEngine } from '../lib/sync';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { nowIso } from '../utils/dates';
import { toRemote } from '../utils/records';
import type { Semester } from '../types';

async function loadSemesters(): Promise<Semester[]> {
  const all = await db.semesters.filter((s) => !s.deleted_at).toArray();
  return all.sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return b.start_date.localeCompare(a.start_date);
  });
}

export function useSemesters() {
  return useQuery({ queryKey: ['semesters'], queryFn: loadSemesters });
}

/** The active semester, resolved from the UI store falling back to is_active. */
export function useActiveSemester(): Semester | null {
  const activeId = useUiStore((s) => s.activeSemesterId);
  const setActive = useUiStore((s) => s.setActiveSemester);
  const { data: semesters } = useSemesters();

  const chosen = useMemo<Semester | null>(() => {
    if (!semesters || semesters.length === 0) return null;
    const byId = activeId ? semesters.find((s) => s.id === activeId) : undefined;
    return byId ?? semesters.find((s) => s.is_active) ?? semesters[0];
  }, [semesters, activeId]);

  useEffect(() => {
    if (chosen && chosen.id !== activeId) setActive(chosen.id);
  }, [chosen, activeId, setActive]);

  return chosen;
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

    const existing = input.id
      ? await db.semesters.get(input.id)
      : undefined;
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

  /** Make one semester active and deactivate the rest. */
  async function activateSemester(id: string): Promise<void> {
    const all = await db.semesters.filter((s) => !s.deleted_at).toArray();
    for (const s of all) {
      const shouldBeActive = s.id === id;
      if (s.is_active !== shouldBeActive) {
        await syncEngine.writeLocal('semesters', 'UPDATE', {
          ...toRemote(s),
          is_active: shouldBeActive,
          updated_at: nowIso(),
        });
      }
    }
    useUiStore.getState().setActiveSemester(id);
    invalidate();
  }

  async function archiveSemester(id: string): Promise<void> {
    const s = await db.semesters.get(id);
    if (!s) return;
    await syncEngine.writeLocal('semesters', 'UPDATE', {
      ...toRemote(s),
      is_active: false,
      updated_at: nowIso(),
    });
    invalidate();
  }

  /** Returns false (and does nothing) if the semester still has sessions. */
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

  return { saveSemester, activateSemester, archiveSemester, deleteSemester };
}
