import { create } from 'zustand';
import { clamp, DEFAULT_TEMPERATURE } from '../sim/temperature';

interface SimMetrics {
  fps: number;
  order: number;
  speed: number;
}

interface SimState {
  temperature: number;
  particleCount: number;
  paused: boolean;
  metrics: SimMetrics;
  setTemperature: (value: number) => void;
  setParticleCount: (value: number) => void;
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
  setMetrics: (metrics: Partial<SimMetrics>) => void;
}

export const useSimStore = create<SimState>((set) => ({
  temperature: DEFAULT_TEMPERATURE,
  particleCount: 1500,
  paused: false,
  metrics: { fps: 0, order: 0.86, speed: 0.7 },
  setTemperature: (value) => set({ temperature: Math.round(clamp(value, -20, 120) * 10) / 10 }),
  setParticleCount: (value) =>
    set({ particleCount: Math.round(clamp(value, 200, 2000) / 50) * 50 }),
  setPaused: (paused) => set({ paused }),
  togglePaused: () => set((state) => ({ paused: !state.paused })),
  setMetrics: (metrics) =>
    set((state) => ({
      metrics: { ...state.metrics, ...metrics },
    })),
}));
