import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  activeSemesterId: string | null;
  quickMarkCourseIndex: number;
  setActiveSemester: (id: string | null) => void;
  setQuickMarkIndex: (i: number) => void;
  nextQuickMarkCourse: () => void;
  prevQuickMarkCourse: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      activeSemesterId: null,
      quickMarkCourseIndex: 0,
      setActiveSemester: (id) => set({ activeSemesterId: id }),
      setQuickMarkIndex: (i) => set({ quickMarkCourseIndex: Math.max(0, i) }),
      nextQuickMarkCourse: () =>
        set((s) => ({ quickMarkCourseIndex: s.quickMarkCourseIndex + 1 })),
      prevQuickMarkCourse: () =>
        set((s) => ({
          quickMarkCourseIndex: Math.max(0, s.quickMarkCourseIndex - 1),
        })),
    }),
    {
      name: 'attend_ui',
      partialize: (s) => ({ activeSemesterId: s.activeSemesterId }),
    }
  )
);
