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
  hasSeenDragTip: boolean;
  setEnabled: (enabled: boolean) => void;
  setOpen: (open: boolean) => void;
  setPosition: (position: CoachPosition | null) => void;
  setHasSeenDragTip: (seen: boolean) => void;
}

export const useCoachPreferences = create<CoachPreferences>()(
  persist(
    (set) => ({
      enabled: true,
      open: false,
      position: null,
      hasSeenDragTip: false,
      setEnabled: (enabled) => set((state) => ({ enabled, open: enabled ? state.open : false })),
      setOpen: (open) => set({ open }),
      setPosition: (position) => set({ position }),
      setHasSeenDragTip: (hasSeenDragTip) => set({ hasSeenDragTip }),
    }),
    {
      name: 'breaking-point-coach',
      partialize: ({ enabled, position, hasSeenDragTip }) => ({
        enabled,
        position,
        hasSeenDragTip,
      }),
    },
  ),
);
