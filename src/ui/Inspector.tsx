import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import {
  analyzeMolecule,
  componentFor,
  displayFormula,
  evaluateTarget,
  evaluateTargetGeometry,
  lonePairCount,
  valenceUsage,
} from '../chem/analysis';
import { connectionDirection, distance } from '../chem/bondRules';
import { getElement } from '../chem/elements';
import { getMolecule } from '../chem/molecules';
import type { ElementSymbol } from '../chem/types';
import { useBuildStore } from '../stores/buildStore';
import { CheckIcon } from './icons';

const COMPOSITION_ORDER: ElementSymbol[] = ['C', 'H', 'N', 'O', 'Na', 'Cl', 'S', 'Ag'];

export function Inspector() {
  const atoms = useBuildStore((state) => state.atoms);
  const bonds = useBuildStore((state) => state.bonds);
  const selectedAtomId = useBuildStore((state) => state.selectedAtomId);
  const targetId = useBuildStore((state) => state.targetId);
  const selectAtom = useBuildStore((state) => state.selectAtom);
  const removeAtom = useBuildStore((state) => state.removeAtom);
  const removeBond = useBuildStore((state) => state.removeBond);
  const cycleBondOrder = useBuildStore((state) => state.cycleBondOrder);
  const bondSelectedTo = useBuildStore((state) => state.bondSelectedTo);
  const measureTargetId = useBuildStore((state) => state.measureTargetId);
  const setMeasureTarget = useBuildStore((state) => state.setMeasureTarget);
  const autoBondSelected = useBuildStore((state) => state.autoBondSelected);
  const target = getMolecule(targetId);
  const analysis = useMemo(() => analyzeMolecule(atoms, bonds), [atoms, bonds]);
  const verdict = useMemo(() => evaluateTarget(atoms, bonds, target), [atoms, bonds, target]);
  const geometry = useMemo(
    () => evaluateTargetGeometry(atoms, bonds, target),
    [atoms, bonds, target],
  );
  const usage = useMemo(() => valenceUsage(atoms, bonds), [atoms, bonds]);
  const selected = atoms.find((atom) => atom.id === selectedAtomId) ?? null;
  const selectedComponent = useMemo(
    () => componentFor(selectedAtomId, atoms, bonds),
    [selectedAtomId, atoms, bonds],
  );
  const selectedAngles = useMemo(
    () => (selected ? analysis.angles.filter((angle) => angle.atomId === selected.id) : []),
    [analysis.angles, selected],
  );
  const selectedBonds = useMemo(
    () =>
      selected ? bonds.filter((bond) => bond.a === selected.id || bond.b === selected.id) : [],
    [bonds, selected],
  );
  const selectedLonePairs = useMemo(() => {
    if (!selected || selectedBonds.length === 0) return null;
    if (selectedBonds.some((bond) => bond.ionic)) return null;
    return lonePairCount(selected.element, usage[selected.id] ?? 0);
  }, [selected, selectedBonds, usage]);
  const measureTarget = useMemo(
    () => atoms.find((atom) => atom.id === measureTargetId) ?? null,
    [atoms, measureTargetId],
  );
  const measureDistance = useMemo(
    () => (selected && measureTarget ? distance(selected.position, measureTarget.position) : null),
    [selected, measureTarget],
  );
  const labels = useMemo(() => {
    const counters = new Map<ElementSymbol, number>();
    const map = new Map<string, string>();
    atoms.forEach((atom) => {
      const next = (counters.get(atom.element) ?? 0) + 1;
      counters.set(atom.element, next);
      map.set(atom.id, `${getElement(atom.element).nameKo} ${next}`);
    });
    return map;
  }, [atoms]);
  const connectionTargets = useMemo(() => {
    if (!selected) return [];
    const isTargetPair = (atom: (typeof atoms)[number]) =>
      selected.targetIndex !== undefined &&
      atom.targetIndex !== undefined &&
      target.bonds.some(
        (bond) =>
          (bond.a === selected.targetIndex && bond.b === atom.targetIndex) ||
          (bond.b === selected.targetIndex && bond.a === atom.targetIndex),
      );
    return atoms
      .filter((atom) => atom.id !== selected.id)
      .filter((atom) => connectionDirection(selected, atom, bonds) !== null)
      .filter(
        (atom) =>
          selected.targetIndex === undefined ||
          atom.targetIndex === undefined ||
          isTargetPair(atom),
      )
      .sort(
        (first, second) =>
          Number(isTargetPair(second)) - Number(isTargetPair(first)) ||
          distanceSquared(first.position, selected.position) -
            distanceSquared(second.position, selected.position),
      )
      .slice(0, 6);
  }, [atoms, bonds, selected, target]);

  const composition = COMPOSITION_ORDER.filter(
    (symbol) => (analysis.composition[symbol] ?? 0) > 0,
  ).map((symbol) => ({
    symbol,
    count: analysis.composition[symbol] ?? 0,
    element: getElement(symbol),
  }));
  const maxCount = Math.max(1, ...composition.map((item) => item.count));

  return (
    <aside className="panel inspector" aria-labelledby="inspector-title">
      <div className="panel-heading">
        <div>
          <h3 id="inspector-title">표본 기록</h3>
          <p>{selected ? labels.get(selected.id) : '분자 전체 요약'}</p>
        </div>
        <span className="panel-index">{selected ? 'SELECTED' : 'SPECIMEN'}</span>
      </div>

      <div
        className={`verdict-card${verdict.complete ? ' is-complete' : ''}`}
        data-testid="target-verdict"
      >
        <div className="verdict-head">
          <span className="verdict-label">목표 판정</span>
          <span className={`verdict-badge${verdict.complete ? ' is-complete' : ''}`}>
            {verdict.complete ? <CheckIcon /> : null}
            {verdict.complete ? '완성' : '진행 중'}
          </span>
        </div>
        <p className="verdict-title">
          {target.nameKo} <span>{displayFormula(target.formula)}</span>
        </p>
        <p className="verdict-message" aria-live="polite">
          {verdict.messageKo}
        </p>
        <div className="progress-chips" data-testid="target-progress">
          {verdict.progress.map((item) => {
            const element = getElement(item.element);
            const done = item.current === item.target;
            return (
              <span
                key={item.element}
                className={`progress-chip${done ? ' is-done' : ''}`}
                style={{ '--element-color': element.color } as CSSProperties}
              >
                <i aria-hidden="true" />
                {item.element} {item.current}/{item.target}
              </span>
            );
          })}
        </div>
        <p className="verdict-hint">{verdict.hintKo}</p>
        {verdict.status === 'wrong-geometry' ? (
          <p className="verdict-hint">
            구조 점수: {geometry.messageKo}
            {geometry.status === 'mismatch'
              ? ` 최대 어긋남 ${geometry.maxDeviationDeg.toFixed(1)}°`
              : ''}
          </p>
        ) : null}
      </div>

      {selected ? (
        <>
          <div className="selected-card">
            <span
              className="selected-orb"
              style={
                {
                  '--element-color': getElement(selected.element).color,
                  '--element-deep': getElement(selected.element).deepColor,
                } as CSSProperties
              }
              aria-hidden="true"
            >
              {selected.element}
            </span>
            <div className="selected-copy">
              <span className="selected-name">{getElement(selected.element).nameKo}</span>
              <span className="selected-sub">
                {getElement(selected.element).categoryKo} · 원자번호{' '}
                {getElement(selected.element).atomicNumber}
              </span>
            </div>
            <button type="button" className="link-button" onClick={() => selectAtom(null)}>
              선택 해제
            </button>
          </div>

          <dl className="stat-grid">
            <div>
              <dt>원자가</dt>
              <dd>{getElement(selected.element).valence}</dd>
            </div>
            <div>
              <dt>전기음성도</dt>
              <dd>{getElement(selected.element).electronegativity.toFixed(2)}</dd>
            </div>
            <div>
              <dt>결합 수</dt>
              <dd>{selectedBonds.length}</dd>
            </div>
            <div>
              <dt>사용한 원자가</dt>
              <dd>{usage[selected.id] ?? 0}</dd>
            </div>
            <div>
              <dt>비공유 전자쌍</dt>
              <dd>{selectedLonePairs === null ? '—' : selectedLonePairs}</dd>
            </div>
            <div>
              <dt>선택 조각</dt>
              <dd>{selectedComponent?.displayFormula || '—'}</dd>
            </div>
          </dl>

          <section className="inspector-section" aria-labelledby="angle-title">
            <div className="section-heading">
              <h4 id="angle-title">결합각</h4>
              <span>{selectedAngles.length ? '3D 오버레이 표시 중' : '결합 1개 이하'}</span>
            </div>
            {selectedAngles.length > 0 ? (
              <ul className="angle-list">
                {selectedAngles.map((angle) => {
                  const first = atoms.find((atom) => atom.id === angle.firstNeighborId);
                  const second = atoms.find((atom) => atom.id === angle.secondNeighborId);
                  return (
                    <li key={`${angle.firstNeighborId}-${angle.secondNeighborId}`}>
                      <span className="angle-name">
                        {first?.element ?? '?'}–{selected.element}–{second?.element ?? '?'}
                      </span>
                      <strong>{angle.angle.toFixed(1)}°</strong>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="empty-copy">두 개 이상의 결합이 있어야 각도를 잴 수 있습니다.</p>
            )}
          </section>

          <section className="inspector-section" aria-labelledby="bond-title">
            <div className="section-heading">
              <h4 id="bond-title">결합</h4>
              <span>{selectedBonds.length}개</span>
            </div>
            {selectedBonds.length > 0 ? (
              <ul className="bond-list">
                {selectedBonds.map((bond) => {
                  const otherId = bond.a === selected.id ? bond.b : bond.a;
                  const other = atoms.find((atom) => atom.id === otherId);
                  return (
                    <li key={bond.id}>
                      <span className="bond-name">
                        {selected.element}–{other?.element ?? '?'}
                        <small>{bond.ionic ? '이온' : `${bond.order}중 결합`}</small>
                      </span>
                      <span className="bond-actions">
                        {!bond.ionic ? (
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => cycleBondOrder(bond.id)}
                            aria-label={`${selected.element}와 ${other?.element ?? '?'}의 결합 차수 바꾸기`}
                          >
                            차수 변경
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="link-button link-danger"
                          onClick={() => removeBond(bond.id)}
                          aria-label={`${selected.element}와 ${other?.element ?? '?'}의 결합 끊기`}
                        >
                          끊기
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="empty-copy">아직 결합이 없습니다.</p>
            )}
          </section>

          <section className="inspector-section" aria-labelledby="measure-title">
            <div className="section-heading">
              <h4 id="measure-title">거리 측정</h4>
              <span>3D 점선 표시</span>
            </div>
            <div className="helper-list">
              <label className="sr-only" htmlFor="measure-target-select">
                거리를 잴 원자
              </label>
              <select
                id="measure-target-select"
                data-testid="measure-select"
                value={measureTargetId ?? ''}
                onChange={(event) => setMeasureTarget(event.target.value || null)}
              >
                <option value="">원자 선택</option>
                {atoms
                  .filter((atom) => selected && atom.id !== selected.id)
                  .map((atom) => (
                    <option key={atom.id} value={atom.id}>
                      {labels.get(atom.id)}
                    </option>
                  ))}
              </select>
              <span data-testid="measure-result" aria-live="polite">
                {measureDistance === null ? '—' : `${measureDistance.toFixed(2)}`}
              </span>
            </div>
          </section>

          <section className="inspector-section helper-section" aria-labelledby="helper-title">
            <div className="section-heading">
              <h4 id="helper-title">결합 도우미</h4>
              <span>키보드로도 연결</span>
            </div>
            <p className="helper-copy">
              연결할 원자를 고르세요. 선택한 원자에 붙이거나 선택한 원자를 붙일 수 있습니다.
            </p>
            <div className="helper-list">
              {connectionTargets.length > 0 ? (
                connectionTargets.map((other) => {
                  const element = getElement(other.element);
                  return (
                    <button
                      key={other.id}
                      type="button"
                      className="host-button"
                      style={{ '--element-color': element.color } as CSSProperties}
                      onClick={() => bondSelectedTo(other.id)}
                    >
                      <i aria-hidden="true" />
                      {labels.get(other.id)} 원자와 결합
                    </button>
                  );
                })
              ) : (
                <p className="empty-copy">지금 연결할 수 있는 원자가 없습니다.</p>
              )}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={() => autoBondSelected()}
              disabled={connectionTargets.length === 0}
            >
              가장 가까운 원자와 자동 결합
            </button>
          </section>

          <button
            type="button"
            className="btn btn-danger-ghost btn-block"
            onClick={() => removeAtom(selected.id)}
          >
            이 원자 치우기
          </button>
        </>
      ) : (
        <>
          <div className="summary-formula">
            <span className="summary-label">현재 조각</span>
            <strong aria-label={analysis.formula || '없음'}>
              {analysis.displayFormula || '—'}
            </strong>
            <div className="summary-meta">
              <span>원자 {analysis.atomCount}</span>
              <span>결합 {analysis.bondCount}</span>
              <span>{analysis.polarity.labelKo}</span>
            </div>
          </div>

          <section className="inspector-section" aria-labelledby="composition-title">
            <div className="section-heading">
              <h4 id="composition-title">조성</h4>
              <span>원자 비율</span>
            </div>
            {composition.length > 0 ? (
              <ul className="composition-list">
                {composition.map((item) => (
                  <li key={item.symbol}>
                    <span className="composition-name">
                      <i
                        style={{ '--element-color': item.element.color } as CSSProperties}
                        aria-hidden="true"
                      />
                      {item.element.nameKo}
                    </span>
                    <span className="composition-bar" aria-hidden="true">
                      <i
                        style={
                          {
                            '--element-color': item.element.color,
                            width: `${(item.count / maxCount) * 100}%`,
                          } as CSSProperties
                        }
                      />
                    </span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-copy">원자를 놓으면 조성이 표시됩니다.</p>
            )}
          </section>

          <section className="inspector-section" aria-labelledby="polarity-title">
            <div className="section-heading">
              <h4 id="polarity-title">극성</h4>
              <span>{analysis.polarity.labelKo}</span>
            </div>
            <div className="polarity-meter">
              <div className="polarity-meter-head">
                <span>합성 극성 벡터</span>
                <strong>{analysis.polarity.magnitude.toFixed(2)}</strong>
              </div>
              <div className="meter-track" aria-hidden="true">
                <i style={{ width: `${Math.min(100, analysis.polarity.magnitude * 80)}%` }} />
              </div>
              <p>
                {analysis.polarity.labelKo === '이온성'
                  ? '이온 사이의 정전기적 인력이 결합을 이룹니다.'
                  : analysis.polarity.isPolar
                    ? '결합의 극성이 한쪽으로 치우쳐 전체 분자가 극성을 띱니다.'
                    : '대칭 구조여서 결합의 극성이 서로 상쇄됩니다.'}
              </p>
            </div>
          </section>

          <p className="inspector-hint">
            원자를 클릭하면 결합각과 결합 도우미가 나타납니다. 3D 무대를 끌어 회전할 수 있습니다.
          </p>
        </>
      )}
    </aside>
  );
}

function distanceSquared(
  first: [number, number, number],
  second: [number, number, number],
): number {
  return (first[0] - second[0]) ** 2 + (first[1] - second[1]) ** 2 + (first[2] - second[2]) ** 2;
}
