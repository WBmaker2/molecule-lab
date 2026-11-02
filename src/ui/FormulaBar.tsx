import { useMemo } from 'react';
import { analyzeMolecule, displayFormula, evaluateTarget } from '../chem/analysis';
import { getMolecule } from '../chem/molecules';
import { getReaction } from '../chem/reactions';
import { useAppStore, type ViewId } from '../stores/appStore';
import { useBuildStore } from '../stores/buildStore';
import { useReactionStore } from '../stores/reactionStore';
import { useSimStore } from '../stores/simStore';
import { phaseInfoForTemperature } from '../sim/temperature';

export function FormulaBar() {
  const view = useAppStore((state) => state.view);
  const atoms = useBuildStore((state) => state.atoms);
  const bonds = useBuildStore((state) => state.bonds);
  const targetId = useBuildStore((state) => state.targetId);
  const target = getMolecule(targetId);
  const analysis = useMemo(() => analyzeMolecule(atoms, bonds), [atoms, bonds]);
  const verdict = useMemo(() => evaluateTarget(atoms, bonds, target), [atoms, bonds, target]);

  return (
    <footer className="formula-bar" aria-label="화학식 상태 바">
      <div className="formula-inner">
        <div className="formula-identity">
          <span className="formula-eyebrow">현재 화학식</span>
          <strong
            className="formula-value"
            data-testid="formula-current"
            aria-label={analysis.formula || '없음'}
          >
            {analysis.displayFormula || '—'}
          </strong>
          <span
            className={`formula-status-dot${verdict.complete ? ' is-complete' : ''}`}
            aria-hidden="true"
          />
        </div>
        <div className="formula-center">
          {view === 'build' ? (
            <span className="formula-verdict" data-testid="formula-verdict">
              <span className="formula-target">
                목표 {target.nameKo} {displayFormula(target.formula)}
              </span>
              <span>{verdict.messageKo}</span>
            </span>
          ) : (
            <ContextLine view={view} />
          )}
        </div>
        <div className="formula-meta">
          {view === 'build' ? (
            <>
              <span>원자 {analysis.atomCount}</span>
              <span>결합 {analysis.bondCount}</span>
              <span>{analysis.polarity.labelKo}</span>
            </>
          ) : (
            <ContextMeta view={view} />
          )}
        </div>
      </div>
    </footer>
  );
}

function ContextLine({ view }: { view: ViewId }) {
  if (view === 'states') return <StatesContext slot="line" />;
  if (view === 'reactions') return <ReactionContext slot="line" />;
  if (view === 'worksheet') {
    return <span className="formula-context">학습지를 인쇄해 수업에서 사용하세요.</span>;
  }
  if (view === 'library') {
    return (
      <span className="formula-context">
        분자 12종·이온 11종의 표본을 살펴보고 조립할 수 있습니다.
      </span>
    );
  }
  return <span className="formula-context">분자 구조를 보고 이름을 맞혀 보세요.</span>;
}

function ContextMeta({ view }: { view: ViewId }) {
  if (view === 'states') return <StatesContext slot="meta" />;
  if (view === 'reactions') return <ReactionContext slot="meta" />;
  if (view === 'worksheet') {
    return (
      <>
        <span>인쇄용</span>
        <span>학습지</span>
      </>
    );
  }
  if (view === 'library') {
    return (
      <>
        <span>분자 12종·이온 11종</span>
        <span>도감</span>
      </>
    );
  }
  return (
    <>
      <span>구조 → 이름</span>
      <span>5문제</span>
    </>
  );
}

function StatesContext({ slot }: { slot: 'line' | 'meta' }) {
  const temperature = useSimStore((state) => state.temperature);
  const particleCount = useSimStore((state) => state.particleCount);
  const phase = phaseInfoForTemperature(temperature);
  if (slot === 'line') {
    return (
      <span className="formula-context">
        {temperature.toFixed(0)}°C · {phase.nameKo} · {phase.summaryKo}
      </span>
    );
  }
  return (
    <>
      <span>입자 {particleCount.toLocaleString('ko-KR')}개</span>
      <span>{phase.nameKo}</span>
    </>
  );
}

function ReactionContext({ slot }: { slot: 'line' | 'meta' }) {
  const reactionId = useReactionStore((state) => state.reactionId);
  const progress = useReactionStore((state) => Math.round(state.progress * 100));
  const reaction = getReaction(reactionId);
  if (slot === 'line') {
    return (
      <span className="formula-context">
        {reaction.titleKo} · {reaction.equation}
      </span>
    );
  }
  return (
    <>
      <span>진행 {progress}%</span>
      <span>{progress >= 100 ? '완료' : '관찰 중'}</span>
    </>
  );
}
