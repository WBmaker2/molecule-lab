import { useState } from 'react';
import { displayFormula } from '../chem/analysis';
import { MOLECULES, getMolecule } from '../chem/molecules';
import { useAppStore } from '../stores/appStore';
import { MoleculeDiagram } from './MoleculeDiagram';

export function WorksheetView() {
  const params = useAppStore((state) => state.params);
  const navigate = useAppStore((state) => state.navigate);
  const requested = typeof params.molecule === 'string' ? params.molecule : '';
  const molecule = getMolecule(
    MOLECULES.some((candidate) => candidate.id === requested) ? requested : 'h2o',
  );
  const [showAnswers, setShowAnswers] = useState(false);

  return (
    <section className="view worksheet-view" aria-labelledby="worksheet-title">
      <div className="worksheet-actions">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('library')}>
          도감으로 돌아가기
        </button>
        <button
          type="button"
          className="btn btn-primary btn-pulse"
          onClick={() => window.print()}
        >
          인쇄하기
        </button>
      </div>
      <article className="worksheet-sheet" aria-labelledby="worksheet-title">
        <header className="worksheet-head">
          <span className="view-kicker">수업 학습지</span>
          <h2 id="worksheet-title">
            {molecule.nameKo}({displayFormula(molecule.formula)}) 관찰 기록지
          </h2>
          <p>
            이름:＿＿＿＿＿＿ 반:＿＿ 모둠:＿＿＿＿＿＿ 날짜:＿＿＿＿＿＿
          </p>
        </header>
        <section aria-label="학습 목표">
          <h3>학습 목표</h3>
          <ul>
            <li>분자를 이루는 원자의 종류와 개수를 셀 수 있다.</li>
            <li>결합각과 분자 모양을 관찰하고 설명할 수 있다.</li>
            <li>극성과 무극성을 구조로 설명할 수 있다.</li>
          </ul>
        </section>
        <section aria-label="관찰할 분자">
          <h3>관찰할 분자</h3>
          <MoleculeDiagram molecule={molecule} className="worksheet-diagram" />
          <dl className="worksheet-facts">
            <div>
              <dt>화학식</dt>
              <dd>{displayFormula(molecule.formula)}</dd>
            </div>
            <div>
              <dt>분자 모양</dt>
              <dd>{molecule.shapeKo}</dd>
            </div>
            <div>
              <dt>극성</dt>
              <dd>{molecule.polarityKo}</dd>
            </div>
            <div>
              <dt>결합각</dt>
              <dd>{molecule.angleKo}</dd>
            </div>
          </dl>
          <p>{molecule.descriptionKo}</p>
        </section>
        <section aria-label="관찰 기록">
          <h3>관찰 기록</h3>
          <ol>
            <li>이 분자를 이루는 원자의 종류와 개수를 쓰세요.＿＿＿＿＿＿＿＿＿＿</li>
            <li>결합각을 읽고, 분자가 곧은지 굽었는지 쓰세요.＿＿＿＿＿＿＿＿＿＿</li>
            <li>이 분자가 {molecule.polarityKo}인 까닭을 구조로 설명하세요.＿＿＿＿＿＿＿＿＿＿</li>
            <li>알고 있나요: {molecule.factKo} 이 사실과 연결되는 까닭을 쓰세요.＿＿＿＿＿＿＿＿＿＿</li>
          </ol>
        </section>
        <section aria-label="오개념 확인">
          <h3>오개념 확인</h3>
          <p>옳으면 O, 틀리면 X를 쓰고 까닭을 한 줄로 쓰세요.</p>
          <ol>
            <li>원자가 많을수록 분자는 항상 극성이다. ( ) ＿＿＿＿＿＿＿＿</li>
            <li>결합이 극성이면 분자는 항상 극성이다. ( ) ＿＿＿＿＿＿＿＿</li>
          </ol>
        </section>
        <section aria-label="모범 답안">
          <h3>모범 답안</h3>
          <button
            type="button"
            className="btn btn-secondary"
            aria-expanded={showAnswers}
            onClick={() => setShowAnswers((value) => !value)}
          >
            {showAnswers ? '모범 답안 숨기기' : '모범 답안 보기'}
          </button>
          {showAnswers ? (
            <ul>
              <li>
                화학식 {displayFormula(molecule.formula)}, 모양 {molecule.shapeKo}, 결합각{' '}
                {molecule.angleKo}.
              </li>
              <li>
                {molecule.polarityKo}인 까닭은 결합의 극성이
                {molecule.polarityKo === '극성' ? ' 한쪽으로 치우치기' : ' 대칭으로 상쇄되기'}{' '}
                때문이다.
              </li>
              <li>두 오개념 문항의 답은 모두 X이다. 까닭은 대칭 구조를 함께 보아야 한다.</li>
            </ul>
          ) : null}
        </section>
      </article>
    </section>
  );
}
