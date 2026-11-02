import { create } from 'zustand';

const PROGRESS_KEY = 'molecule-lab:quiz-progress:v1';
const DEFAULT_SEED = 2026;
const DEFAULT_LENGTH = 5;

export interface QuizProgress {
  best: number | null;
  attempts: number;
  history: Record<string, { asked: number; correct: number }>;
}

interface QuizSessionState extends QuizProgress {
  seed: number;
  length: number;
  index: number;
  selectedId: string | null;
  results: boolean[];
  finished: boolean;
  start: (seed?: number, length?: number) => void;
  choose: (optionId: string, answerId: string, moleculeId: string) => void;
  next: (lastIndex: number) => void;
  restart: () => void;
}

function readProgress(): QuizProgress {
  const fallback: QuizProgress = { best: null, attempts: 0, history: {} };
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<QuizProgress>;
    return {
      best: typeof parsed.best === 'number' ? parsed.best : null,
      attempts: typeof parsed.attempts === 'number' ? parsed.attempts : 0,
      history: parsed.history && typeof parsed.history === 'object' ? parsed.history : {},
    };
  } catch {
    return fallback;
  }
}

function writeProgress(progress: QuizProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    return;
  }
}

export function quizScore(results: boolean[]): number {
  return results.filter(Boolean).length;
}

export const useQuizStore = create<QuizSessionState>((set, get) => ({
  ...readProgress(),
  seed: DEFAULT_SEED,
  length: DEFAULT_LENGTH,
  index: 0,
  selectedId: null,
  results: [],
  finished: false,

  start: (seed = DEFAULT_SEED, length = DEFAULT_LENGTH) => {
    set({
      seed,
      length,
      index: 0,
      selectedId: null,
      results: [],
      finished: false,
    });
  },

  choose: (optionId, answerId, moleculeId) => {
    const state = get();
    if (state.selectedId || state.finished) return;
    const correct = optionId === answerId;
    const history = { ...state.history };
    const entry = history[moleculeId] ?? { asked: 0, correct: 0 };
    history[moleculeId] = { asked: entry.asked + 1, correct: entry.correct + (correct ? 1 : 0) };
    const results = [...state.results, correct];
    set({ selectedId: optionId, results, history });
    writeProgress({ best: state.best, attempts: state.attempts, history });
  },

  next: (lastIndex) => {
    const state = get();
    if (!state.selectedId || state.finished) return;
    if (state.index >= lastIndex) {
      const score = quizScore(state.results);
      const best = state.best === null ? score : Math.max(state.best, score);
      const progress = {
        best,
        attempts: state.attempts + 1,
        history: state.history,
      };
      set({ finished: true, ...progress });
      writeProgress(progress);
      return;
    }
    set({ index: state.index + 1, selectedId: null });
  },

  restart: () => {
    get().start(Date.now() % 100000, get().length);
  },
}));
