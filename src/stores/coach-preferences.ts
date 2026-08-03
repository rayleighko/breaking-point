import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CoachPosition {
  x: number;
  y: number;
}

interface CoachPreferences {
  open: boolean;
  position: CoachPosition | null;
  setOpen: (open: boolean) => void;
  setPosition: (position: CoachPosition | null) => void;
}

export const useCoachPreferences = create<CoachPreferences>()(
  persist(
    (set) => ({
      open: false,
      position: null,
      setOpen: (open) => set({ open }),
      setPosition: (position) => set({ position }),
    }),
    {
      name: 'breaking-point-coach',
      partialize: ({ position }) => ({ position }),
    },
  ),
);
