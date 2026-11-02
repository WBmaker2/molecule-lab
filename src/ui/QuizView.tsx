import { useMemo, useState } from 'react';
import { getMolecule, MOLECULES } from '../chem/molecules';
import { buildQuiz } from '../lib/quiz';
import { PreviewScene } from '../scene/PreviewScene';
import { ArrowIcon, CheckIcon, SparkIcon } from './icons';

const QUESTION_COUNT = 5;

export function QuizView() {
  const [seed, setSeed] = useState(2026);
  const questions = useMemo(() => buildQuiz(MOLECULES, seed, QUESTION_COUNT), [seed]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const current = questions[index];
  const molecule = getMolecule(current.moleculeId);
  const score = results.filter(Boolean).length;
  const isCorrect = selected === current.answerId;
  const structureDescription = `원자 ${molecule.atoms
    .map((atom) => atom.element)
    .join(', ')}로 이루어진 ${molecule.shapeKo} 구조, 결합 ${molecule.bonds.length}개`;

  const choose = (optionId: string) => {
    if (selected) return;
    setSelected(optionId);
    setResults((previous) => [...previous, optionId === current.answerId]);
  };

  const next = () => {
    if (!selected) return;
    if (index >= questions.length - 1) {
      setFinished(true);
      return;
    }
    setIndex((value) => value + 1);
    setSelected(null);
  };

  const restart = () => {
    setSeed(Date.now() % 100000);
    setIndex(0);
    setSelected(null);
    setResults([]);
    setFinished(false);
  };

  if (finished) {
    return (
      <section className="view quiz-view" aria-labelledby="quiz-title">
        <div className="view-heading">
          <div className="view-heading-copy">
            <span className="view-kicker">분자 퀴즈</span>
            <h2 id="quiz-title">구조를 보고 이름을 맞혀 보세요</h2>
            <p>분자의 원자 배열과 결합 방향을 단서로 이름을 떠올려 보세요.</p>
          </div>
        </div>
        <div className="quiz-result panel">
          <span className="result-mark" aria-hidden="true">
            <SparkIcon />
          </span>
          <span className="result-kicker">퀴즈 완료</span>
          <h3>
            {score} / {questions.length}
          </h3>
          <p>
            {score === questions.length
              ? '모든 구조를 정확하게 알아보았습니다. 도감에서 다른 분자도 살펴보세요.'
              : score >= 3
                ? '구조의 특징을 잘 읽고 있습니다. 틀린 분자는 도감에서 다시 확인해 보세요.'
                : '분자 모양과 원자 구성을 도감에서 다시 살펴보면 더 쉬워집니다.'}
          </p>
          <div className="result-dots" aria-hidden="true">
            {results.map((result, resultIndex) => (
              <span key={resultIndex} className={result ? 'is-correct' : 'is-wrong'} />
            ))}
          </div>
          <div className="result-actions">
            <button type="button" className="btn btn-primary btn-pulse" onClick={restart}>
              다시 풀기
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="view quiz-view" aria-labelledby="quiz-title">
      <div className="view-heading">
        <div className="view-heading-copy">
          <span className="view-kicker">분자 퀴즈</span>
          <h2 id="quiz-title">구조를 보고 이름을 맞혀 보세요</h2>
          <p>
            분자의 원자 배열과 결합 방향을 단서로 이름을 떠올려 보세요. 정답을 고르면 짧은 해설이
            이어집니다.
          </p>
        </div>
        <div className="quiz-score" aria-label={`현재 점수 ${score}점`}>
          <span>
            문제 {index + 1} / {questions.length}
          </span>
          <strong data-testid="quiz-score">{score}점</strong>
        </div>
      </div>

      <div className="quiz-layout">
        <section className="stage-shell quiz-stage" aria-labelledby="quiz-stage-title">
          <div className="stage-topbar">
            <div className="stage-heading">
              <span>구조 관찰</span>
              <h3 id="quiz-stage-title">이 분자의 이름은?</h3>
            </div>
            <span className="live-chip">
              <i aria-hidden="true" /> 3D 구조
            </span>
          </div>
          <div className="stage-canvas quiz-canvas">
            <PreviewScene
              molecule={molecule}
              autoRotate
              showLabels
              ariaLabel={structureDescription}
            />
            <div className="quiz-stage-note" aria-hidden="true">
              원자의 종류와 결합 방향을 살펴보세요
            </div>
          </div>
          <div className="stage-status">
            <span className="stage-hint">
              <i aria-hidden="true" /> 원자 {molecule.atoms.length} · 결합 {molecule.bonds.length}
            </span>
            <span className="stage-count">{molecule.shapeKo}</span>
          </div>
        </section>

        <section className="panel quiz-panel" aria-labelledby="quiz-question-title">
          <div className="question-head">
            <span className="question-index" data-testid="quiz-index">
              문제 {index + 1}
            </span>
            <div className="quiz-progress" role="group" aria-label={`${index + 1}번째 문제`}>
              {questions.map((question, questionIndex) => {
                const result = results[questionIndex];
                return (
                  <span
                    key={question.moleculeId}
                    className={`quiz-progress-dot${
                      result === true
                        ? ' is-correct'
                        : result === false
                          ? ' is-wrong'
                          : questionIndex === index
                            ? ' is-current'
                            : ''
                    }`}
                    aria-hidden="true"
                  />
                );
              })}
            </div>
          </div>
          <h3 id="quiz-question-title">이 구조의 이름은 무엇일까요?</h3>
          <p className="question-note">정답을 고르면 해설이 나타납니다.</p>
          <div className="quiz-options" role="group" aria-label="분자 이름 보기">
            {current.options.map((option, optionIndex) => {
              const correct = option.id === current.answerId;
              const chosen = option.id === selected;
              const className = selected
                ? correct
                  ? 'is-correct'
                  : chosen
                    ? 'is-wrong'
                    : 'is-dimmed'
                : '';
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`quiz-option ${className}`}
                  onClick={() => choose(option.id)}
                  disabled={Boolean(selected)}
                  aria-pressed={chosen}
                >
                  <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                  <span>{option.nameKo}</span>
                  {selected && correct ? <CheckIcon /> : null}
                </button>
              );
            })}
          </div>

          <div className="quiz-feedback" aria-live="polite">
            {selected ? (
              <>
                <strong className={isCorrect ? 'is-correct' : 'is-wrong'}>
                  {isCorrect ? '정답입니다' : '아쉽지만 다시 기억해 두세요'}
                </strong>
                <p>
                  {isCorrect
                    ? molecule.factKo
                    : `${molecule.nameKo}(${molecule.formula}) 구조였습니다. ${molecule.factKo}`}
                </p>
              </>
            ) : (
              <p>보기에서 이름을 골라 주세요.</p>
            )}
          </div>

          <button
            type="button"
            className={`btn btn-primary btn-block${selected ? ' btn-pulse' : ''}`}
            onClick={next}
            disabled={!selected}
          >
            {index >= questions.length - 1 ? '결과 보기' : '다음 문제'}
            <ArrowIcon />
          </button>
        </section>
      </div>
    </section>
  );
}
