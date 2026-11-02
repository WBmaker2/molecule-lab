import { create } from 'zustand';
import { getReaction } from '../chem/reactions';
import { clamp } from '../sim/temperature';

interface ReactionState {
  reactionId: string;
  progress: number;
  playing: boolean;
  speed: number;
  duration: number;
  stepTimes: number[];
  setReaction: (id: string) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  restart: () => void;
  setProgress: (value: number) => void;
  jumpTo: (value: number) => void;
  setSpeed: (speed: number) => void;
  tick: (delta: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
}

const initialReaction = getReaction('neutralization');

export const useReactionStore = create<ReactionState>((set, get) => ({
  reactionId: initialReaction.id,
  progress: 0,
  playing: false,
  speed: 1,
  duration: initialReaction.duration,
  stepTimes: initialReaction.steps.map((step) => step.at),

  setReaction: (id) => {
    const reaction = getReaction(id);
    set({
      reactionId: reaction.id,
      progress: 0,
      playing: false,
      duration: reaction.duration,
      stepTimes: reaction.steps.map((step) => step.at),
    });
  },

  play: () =>
    set((state) => ({
      playing: true,
      progress: state.progress >= 1 ? 0 : state.progress,
    })),

  pause: () => set({ playing: false }),

  toggle: () => {
    const state = get();
    if (state.playing) {
      set({ playing: false });
    } else {
      set({ playing: true, progress: state.progress >= 1 ? 0 : state.progress });
    }
  },

  restart: () => set({ progress: 0, playing: false }),

  setProgress: (value) => set({ progress: clamp(value, 0, 1) }),

  jumpTo: (value) => set({ progress: clamp(value, 0, 1), playing: false }),

  setSpeed: (speed) => set({ speed: clamp(speed, 0.5, 2) }),

  tick: (delta) => {
    const state = get();
    if (!state.playing) return;
    const next = state.progress + (delta * state.speed) / state.duration;
    if (next >= 1) set({ progress: 1, playing: false });
    else set({ progress: next });
  },

  stepForward: () => {
    const state = get();
    const next = state.stepTimes.find((time) => time > state.progress + 0.005);
    set({ progress: next ?? 1, playing: false });
  },

  stepBackward: () => {
    const state = get();
    const previous = [...state.stepTimes].reverse().find((time) => time < state.progress - 0.005);
    set({ progress: previous ?? 0, playing: false });
  },
}));
