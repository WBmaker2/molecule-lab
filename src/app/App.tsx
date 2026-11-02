import { useEffect } from 'react';
import { applyCurrentHash, applyRoute } from '../lib/applyRoute';
import { parseHash } from '../lib/routes';
import { loadSavedWorkbench, saveWorkbench } from '../lib/share';
import { useBuildStore } from '../stores/buildStore';
import { BuildView } from '../ui/BuildView';
import { FormulaBar } from '../ui/FormulaBar';
import { LibraryView } from '../ui/LibraryView';
import { QuizView } from '../ui/QuizView';
import { ReactionView } from '../ui/ReactionView';
import { StatesView } from '../ui/StatesView';
import { WorksheetView } from '../ui/WorksheetView';
import { BrandMark, BuildIcon, LibraryIcon, QuizIcon, ReactionIcon, StatesIcon } from '../ui/icons';
import { useAppStore, type ViewId } from '../stores/appStore';

const NAV: { id: ViewId; label: string; icon: typeof BuildIcon }[] = [
  { id: 'build', label: '조립대', icon: BuildIcon },
  { id: 'states', label: '상태변화', icon: StatesIcon },
  { id: 'reactions', label: '반응 극장', icon: ReactionIcon },
  { id: 'library', label: '분자 도감', icon: LibraryIcon },
  { id: 'quiz', label: '퀴즈', icon: QuizIcon },
];

const TITLES: Record<ViewId, string> = {
  build: '분자 조립대',
  states: '상태변화 무대',
  reactions: '반응 극장',
  library: '분자 도감',
  quiz: '분자 퀴즈',
  worksheet: '학습지',
};

export function App() {
  const view = useAppStore((state) => state.view);
  const setView = useAppStore((state) => state.setView);

  useEffect(() => {
    applyRoute(parseHash(window.location.hash));
    const handleHash = () => applyCurrentHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    const params = parseHash(window.location.hash).params;
    if (Object.keys(params).filter((key) => key !== 'safe').length === 0) {
      const saved = loadSavedWorkbench();
      if (saved) useBuildStore.getState().importWorkbench(saved);
    }
    return useBuildStore.subscribe(() => {
      saveWorkbench(useBuildStore.getState().exportWorkbench());
    });
  }, []);

  useEffect(() => {
    document.title = `${TITLES[view]} — Molecule Lab`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <div className="grain" aria-hidden="true" />
      <header className="masthead">
        <div className="masthead-inner">
          <button
            type="button"
            className="brand"
            onClick={() => setView('build')}
            aria-label="Molecule Lab 조립대로 이동"
          >
            <span className="brand-mark">
              <BrandMark />
            </span>
            <span className="brand-copy">
              <span className="brand-title">Molecule Lab</span>
              <span className="brand-sub">3D 분자 표본실</span>
            </span>
          </button>

          <nav className="view-tabs" aria-label="실험실 화면">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`view-tab${active ? ' is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setView(item.id)}
                >
                  <Icon />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="masthead-note">
            <span aria-hidden="true" />
            중2–고1 화학
          </div>
        </div>
      </header>

      <main id="main" className="app-main">
        {view === 'build' ? <BuildView /> : null}
        {view === 'states' ? <StatesView /> : null}
        {view === 'reactions' ? <ReactionView /> : null}
        {view === 'library' ? <LibraryView /> : null}
        {view === 'quiz' ? <QuizView /> : null}
        {view === 'worksheet' ? <WorksheetView /> : null}
      </main>

      <FormulaBar />
    </div>
  );
}
