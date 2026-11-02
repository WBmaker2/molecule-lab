import type { CSSProperties } from 'react';
import { displayFormula } from '../chem/analysis';
import { getElement } from '../chem/elements';
import { getMolecule } from '../chem/molecules';
import { BuildScene } from '../scene/BuildScene';
import { useBuildStore } from '../stores/buildStore';
import { AngleIcon, PolarityIcon, SparkIcon } from './icons';
import { Inspector } from './Inspector';
import { Palette } from './Palette';

export function BuildView() {
  const atoms = useBuildStore((state) => state.atoms);
  const bonds = useBuildStore((state) => state.bonds);
  const targetId = useBuildStore((state) => state.targetId);
  const notice = useBuildStore((state) => state.notice);
  const showAngles = useBuildStore((state) => state.showAngles);
  const showPolarity = useBuildStore((state) => state.showPolarity);
  const toggleAngles = useBuildStore((state) => state.toggleAngles);
  const togglePolarity = useBuildStore((state) => state.togglePolarity);
  const loadMolecule = useBuildStore((state) => state.loadMolecule);
  const target = getMolecule(targetId);

  return (
    <section className="view build-view" aria-labelledby="build-title">
      <div className="view-heading">
        <div className="view-heading-copy">
          <span className="view-kicker">표본 조립대</span>
          <h2 id="build-title">분자를 직접 조립하세요</h2>
          <p>
            팔레트에서 원자를 놓고 다른 원자 가까이로 끌어 보세요. 결합이 만들어지면 결합각과 극성을
            바로 확인할 수 있습니다.
          </p>
        </div>
        <div className="target-card">
          <div className="target-card-head">
            <span className="target-label">목표 표본</span>
            <span className="target-formula">{displayFormula(target.formula)}</span>
          </div>
          <div className="target-body">
            <span
              className="target-orb"
              style={
                {
                  '--target-accent': target.accent,
                } as CSSProperties
              }
              aria-hidden="true"
            >
              <SparkIcon />
            </span>
            <div>
              <strong>{target.nameKo}</strong>
              <span>
                {target.shapeKo} · {target.polarityKo}
              </span>
            </div>
          </div>
          <div className="target-atoms" aria-hidden="true">
            {target.atoms.map((atom, index) => (
              <span
                key={`${atom.element}-${index}`}
                style={
                  {
                    '--element-color': getElement(atom.element).color,
                  } as CSSProperties
                }
              >
                {atom.element}
              </span>
            ))}
          </div>
          <div className="target-actions">
            <button
              type="button"
              className="btn btn-primary btn-pulse"
              onClick={() => loadMolecule(target.id, 'target')}
            >
              목표 새로 조립
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => loadMolecule(target.id, 'complete')}
            >
              완성본 보기
            </button>
          </div>
        </div>
      </div>

      <div className="build-layout">
        <Palette />

        <section className="stage-shell" aria-labelledby="build-stage-title">
          <div className="stage-topbar">
            <div className="stage-heading">
              <span>표본 무대</span>
              <h3 id="build-stage-title">자유 조립</h3>
            </div>
            <div className="stage-tools" role="group" aria-label="3D 표시 설정">
              <button
                type="button"
                className={`tool-toggle${showAngles ? ' is-on' : ''}`}
                aria-pressed={showAngles}
                onClick={toggleAngles}
              >
                <AngleIcon />
                결합각
              </button>
              <button
                type="button"
                className={`tool-toggle${showPolarity ? ' is-on' : ''}`}
                aria-pressed={showPolarity}
                onClick={togglePolarity}
              >
                <PolarityIcon />
                극성
              </button>
            </div>
          </div>
          <div className="stage-canvas build-canvas">
            <BuildScene />
            {atoms.length === 0 ? (
              <div className="stage-empty">
                <span className="stage-empty-mark" aria-hidden="true">
                  <SparkIcon />
                </span>
                <strong>실험대가 비어 있습니다</strong>
                <p>팔레트에서 원자를 놓거나 목표 분자를 시작해 보세요.</p>
                <button
                  type="button"
                  className="btn btn-primary btn-pulse"
                  onClick={() => loadMolecule(target.id, 'target')}
                >
                  {target.nameKo} 분자 시작
                </button>
              </div>
            ) : null}
          </div>
          <div className="stage-status">
            <span className="stage-hint">
              <i aria-hidden="true" /> 원자를 끌어 다른 원자에 결합
            </span>
            <span className="stage-count">
              원자 {atoms.length} · 결합 {bonds.length}
            </span>
          </div>
          <p className="stage-notice" role="status" aria-live="polite">
            {notice}
          </p>
        </section>

        <Inspector />
      </div>
    </section>
  );
}
