import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Which classes the dashboard and calendar show:
 *   'all'   — every class
 *   'other' — standalone classes (no semester)
 *   <id>    — classes in that semester
 */
export type ViewFilter = 'all' | 'other' | string;

interface UiState {
  viewFilter: ViewFilter;
  setViewFilter: (filter: ViewFilter) => void;
  /**
   * Whether the class list is expanded, remembered per course id.
   * A missing entry means expanded (the default).
   */
  classesExpanded: Record<string, boolean>;
  setClassesExpanded: (courseId: string, expanded: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      viewFilter: 'all',
      setViewFilter: (filter) => set({ viewFilter: filter }),
      classesExpanded: {},
      setClassesExpanded: (courseId, expanded) =>
        set((s) => ({
          classesExpanded: { ...s.classesExpanded, [courseId]: expanded },
        })),
    }),
    {
      name: 'attend_ui',
      partialize: (s) => ({
        viewFilter: s.viewFilter,
        classesExpanded: s.classesExpanded,
      }),
    }
  )
);
