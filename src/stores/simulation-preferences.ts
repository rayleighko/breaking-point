import { create } from 'zustand';

export type PlaybackSpeed = 1 | 4 | 8;

interface SimulationPreferences {
  playbackSpeed: PlaybackSpeed;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
}

export const useSimulationPreferences = create<SimulationPreferences>((set) => ({
  playbackSpeed: 8,
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
}));
