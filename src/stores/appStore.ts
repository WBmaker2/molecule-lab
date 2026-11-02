import { create } from 'zustand';

export type ViewId = 'build' | 'states' | 'reactions' | 'library' | 'quiz';

const VIEWS: ViewId[] = ['build', 'states', 'reactions', 'library', 'quiz'];

function readHash(): ViewId {
  if (typeof window === 'undefined') return 'build';
  const value = window.location.hash.replace('#', '');
  return VIEWS.includes(value as ViewId) ? (value as ViewId) : 'build';
}

interface AppState {
  view: ViewId;
  setView: (view: ViewId) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: readHash(),
  setView: (view) => {
    if (typeof window !== 'undefined' && window.location.hash !== `#${view}`) {
      window.history.replaceState(null, '', `#${view}`);
    }
    set({ view });
  },
}));

export function isViewId(value: string): value is ViewId {
  return VIEWS.includes(value as ViewId);
}
