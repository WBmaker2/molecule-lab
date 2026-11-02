import { create } from 'zustand';
import { formatHash, parseHash, VIEW_IDS, type RouteParams } from '../lib/routes';

export type ViewId = 'build' | 'states' | 'reactions' | 'library' | 'quiz' | 'worksheet';

function readLocation(): { view: ViewId; params: RouteParams } {
  if (typeof window === 'undefined') return { view: 'build', params: {} };
  const location = parseHash(window.location.hash);
  return { view: location.view, params: location.params };
}

function writeHash(view: ViewId, params: RouteParams): void {
  if (typeof window === 'undefined') return;
  const hash = formatHash({ view, params });
  if (window.location.hash !== hash) {
    window.history.replaceState(null, '', hash);
  }
}

interface AppState {
  view: ViewId;
  params: RouteParams;
  navigate: (view: ViewId, params?: RouteParams) => void;
  setView: (view: ViewId) => void;
  mergeParams: (patch: RouteParams) => void;
  applyLocation: (view: ViewId, params: RouteParams) => void;
}

const initial = readLocation();

export const useAppStore = create<AppState>((set, get) => ({
  view: initial.view,
  params: initial.params,

  navigate: (view, params = {}) => {
    writeHash(view, params);
    set({ view, params });
  },

  setView: (view) => {
    const safe = get().params.safe;
    get().navigate(view, safe ? { safe } : {});
  },

  mergeParams: (patch) => {
    const state = get();
    const params = { ...state.params, ...patch };
    for (const key of Object.keys(params)) {
      if (params[key] === '') delete params[key];
    }
    writeHash(state.view, params);
    set({ params });
  },

  applyLocation: (view, params) => {
    set({ view, params });
  },
}));

export function isViewId(value: string): value is ViewId {
  return VIEW_IDS.includes(value as ViewId);
}
