import { create } from 'zustand';

import type { SimConfig, Stats } from '@/lib/engine';

export type LabId = 'connection-pool' | 'queue-sense';

export interface LabSnapshot {
  labId: LabId;
  title: string;
  config: SimConfig;
  stats: Stats;
  running: boolean;
  visible: boolean;
  health: 'safe' | 'tight' | 'over';
  needed: number;
  utilization: number;
  maxThroughput: number;
  updatedAt: number;
}

export interface LabPatch {
  arrivalRate?: number;
  poolSize?: number;
  serviceTime?: number;
  acquireTimeout?: number;
  retry?: boolean;
}

interface LabControls {
  patch: (patch: LabPatch) => void;
  setRunning: (running: boolean) => void;
  reset: () => void;
  focus: () => void;
}

interface LabSessionState {
  snapshot: LabSnapshot | null;
  controls: LabControls | null;
  publish: (snapshot: LabSnapshot) => void;
  connect: (controls: LabControls) => () => void;
  clear: (labId: LabId) => void;
}

export const useLabSession = create<LabSessionState>((set, get) => ({
  snapshot: null,
  controls: null,
  publish: (snapshot) => set({ snapshot }),
  connect: (controls) => {
    set({ controls });
    return () => {
      if (get().controls === controls) set({ controls: null });
    };
  },
  clear: (labId) => {
    if (get().snapshot?.labId === labId) set({ snapshot: null, controls: null });
  },
}));
