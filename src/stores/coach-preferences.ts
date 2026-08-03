import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CoachPosition {
  x: number;
  y: number;
}

interface CoachPreferences {
  enabled: boolean;
  open: boolean;
  position: CoachPosition | null;
  setEnabled: (enabled: boolean) => void;
  setOpen: (open: boolean) => void;
  setPosition: (position: CoachPosition | null) => void;
}

export const useCoachPreferences = create<CoachPreferences>()(
  persist(
    (set) => ({
      enabled: true,
      open: false,
      position: null,
      setEnabled: (enabled) => set({ enabled, open: enabled }),
      setOpen: (open) => set({ open }),
      setPosition: (position) => set({ position }),
    }),
    {
      name: 'breaking-point-coach',
      partialize: ({ enabled, position }) => ({ enabled, position }),
    },
  ),
);
