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
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      viewFilter: 'all',
      setViewFilter: (filter) => set({ viewFilter: filter }),
    }),
    {
      name: 'attend_ui',
      partialize: (s) => ({ viewFilter: s.viewFilter }),
    }
  )
);
