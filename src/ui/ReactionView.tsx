import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useEffect } from 'react';
import { REACTIONS, getReaction } from '../chem/reactions';
import { ReactionStage } from '../scene/ReactionStage';
import { useAppStore } from '../stores/appStore';
import { WebGLGate } from './WebGLGate';
import { useReactionStore } from '../stores/reactionStore';
import {
  CheckIcon,
  PauseIcon,
  PlayIcon,
  RestartIcon,
  StepBackIcon,
  StepForwardIcon,
} from './icons';

const SPEEDS = [0.5, 1, 1.5, 2];

export function ReactionView() {
  const reactionId = useReactionStore((state) => state.reactionId);
  const playing = useReactionStore((state) => state.playing);
  const speed = useReactionStore((state) => state.speed);
  const progress = useReactionStore((state) => Math.round(state.progress * 200) / 200);
  const setReaction = useReactionStore((state) => state.setReaction);
  const toggle = useReactionStore((state) => state.toggle);
  const restart = useReactionStore((state) => state.restart);
  const jumpTo = useReactionStore((state) => state.jumpTo);
  const setSpeed = useReactionStore((state) => state.setSpeed);
  const stepForward = useReactionStore((state) => state.stepForward);
  const stepBackward = useReactionStore((state) => state.stepBackward);
  const mergeParams = useAppStore((state) => state.mergeParams);
  const [showLabels, setShowLabels] = useState(true);
  const safeMode = useAppStore((state) => state.params.safe) === '1';

  useEffect(() => {
    mergeParams({ id: reactionId, speed: String(speed) });
  }, [reactionId, speed, mergeParams]);

  const jumpAndSync = (value: number) => {
    jumpTo(value);
    mergeParams({ id: reactionId, speed: String(speed), t: String(Math.round(value * 1000) / 1000) });
  };
  const reaction = getReaction(reactionId);
  const completed = progress >= 0.999;
  const activeStepIndex = reaction.steps.reduce(
    (current, step, index) => (progress + 0.001 >= step.at ? index : current),
    0,
  );
  const activeStep = reaction.steps[activeStepIndex];
  const elapsed = progress * reaction.duration;

  return (
    <section className="view reaction-view" aria-labelledby="reaction-title">
      <div className="view-heading">
        <div className="view-heading-copy">
          <span className="view-kicker">반응 극장</span>
          <h2 id="reaction-title">이온이 만나 새로운 물질이 됩니다</h2>
          <p>
            중화 반응과 앙금 생성 반응을 단계별로 재생해 보세요. 이온의 움직임과 반응식, 알짜
            이온식을 나란히 보며 생성물이 어떻게 만들어지는지 관찰할 수 있습니다.
          </p>
        </div>
        <div className="reaction-summary">
          <span>현재 장면</span>
          <strong>{reaction.titleKo}</strong>
          <small>{reaction.sceneKo}</small>
        </div>
      </div>

      <div className="reaction-layout">
        <aside className="panel reaction-list" aria-label="반응 선택">
          <div className="panel-heading panel-heading-compact">
            <div>
              <h3>반응 선택</h3>
              <p>{REACTIONS.length}가지 장면</p>
            </div>
            <span className="panel-index">{REACTIONS.length}</span>
          </div>
          <div className="reaction-choice-list">
            {REACTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`reaction-choice${item.id === reactionId ? ' is-active' : ''}`}
                style={{ '--reaction-accent': item.accent } as CSSProperties}
                aria-pressed={item.id === reactionId}
                onClick={() => {
                  setReaction(item.id);
                  mergeParams({ id: item.id, speed: String(speed), t: '' });
                }}
                data-testid={`reaction-${item.id}`}
              >
                <span className="reaction-choice-number">
                  {String(
                    REACTIONS.findIndex((candidate) => candidate.id === item.id) + 1,
                  ).padStart(2, '0')}
                </span>
                <span className="reaction-choice-copy">
                  <strong>{item.titleKo}</strong>
                  <small>{item.equation}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="reaction-list-note">
            <strong>관찰 방법</strong>
            <p>
              재생 버튼을 누르고 이온의 색과 이동 방향을 따라가 보세요. 단계 버튼으로 중요한 순간을
              멈춰 볼 수 있습니다.
            </p>
          </div>
        </aside>

        <section className="stage-shell reaction-stage" aria-labelledby="reaction-stage-title">
          <div className="stage-topbar">
            <div className="stage-heading">
              <span>반응 무대</span>
              <h3 id="reaction-stage-title">{reaction.titleKo}</h3>
            </div>
            <div className="stage-tools">
              <button
                type="button"
                className={`tool-toggle${showLabels ? ' is-on' : ''}`}
                aria-pressed={showLabels}
                onClick={() => setShowLabels((value) => !value)}
              >
                이온 라벨
              </button>
              {completed ? (
                <span className="complete-chip" data-testid="reaction-complete">
                  <CheckIcon />
                  반응 완료
                </span>
              ) : (
                <span className="live-chip">
                  <i aria-hidden="true" />
                  {playing ? '재생 중' : '대기'}
                </span>
              )}
            </div>
          </div>
          <div className="stage-canvas reaction-canvas">
            <WebGLGate
              label={`${reaction.titleKo} 3D 반응 극장`}
              summary={`${reaction.equation} 장면입니다. 타임라인 단계와 반응식을 따라 관찰하세요.`}
              forceFallback={safeMode}
            >
              <ReactionStage reaction={reaction} showLabels={showLabels} />
            </WebGLGate>
            <div className="reaction-caption" aria-hidden="true">
              <span>{Math.round(progress * 100)}%</span>
              <strong>{activeStep.titleKo}</strong>
            </div>
          </div>
          <div className="theater-controls">
            <div className="transport" role="group" aria-label="재생 조작">
              <button
                type="button"
                className="icon-button"
                onClick={restart}
                aria-label="반응 처음으로"
              >
                <RestartIcon />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  stepBackward();
                  mergeParams({
                    id: reactionId,
                    speed: String(speed),
                    t: String(useReactionStore.getState().progress),
                  });
                }}
                aria-label="이전 단계"
              >
                <StepBackIcon />
              </button>
              <button
                type="button"
                className={`btn btn-primary theater-play${
                  playing || completed ? '' : ' btn-pulse'
                }`}
                onClick={toggle}
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
                {playing ? '일시정지' : completed ? '다시 재생' : '반응 재생'}
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  stepForward();
                  mergeParams({
                    id: reactionId,
                    speed: String(speed),
                    t: String(useReactionStore.getState().progress),
                  });
                }}
                aria-label="다음 단계"
              >
                <StepForwardIcon />
              </button>
            </div>
            <div className="theater-scrubber">
              <label className="sr-only" htmlFor="reaction-progress-range">
                반응 진행
              </label>
              <input
                id="reaction-progress-range"
                className="range range-progress"
                type="range"
                min={0}
                max={1000}
                step={1}
                value={Math.round(progress * 1000)}
                aria-valuetext={`${Math.round(progress * 100)}퍼센트`}
                data-testid="reaction-progress"
                data-progress={progress.toFixed(3)}
                onChange={(event) => jumpAndSync(Number(event.target.value) / 1000)}
              />
              <span className="theater-time" aria-hidden="true">
                {elapsed.toFixed(1)}s / {reaction.duration}s
              </span>
            </div>
            <div className="speed-control" role="group" aria-label="재생 속도">
              {SPEEDS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={speed === value ? 'is-active' : ''}
                  aria-pressed={speed === value}
                  onClick={() => setSpeed(value)}
                >
                  {value}×
                </button>
              ))}
            </div>
          </div>
          <p className="stage-notice" aria-live="polite">
            {completed ? '반응이 완료되었습니다. 생성물을 확인해 보세요.' : activeStep.titleKo}
          </p>
        </section>

        <aside className="panel timeline-panel" aria-labelledby="timeline-title">
          <div
            className="equation-card"
            style={{ '--reaction-accent': reaction.accent } as CSSProperties}
          >
            <span className="equation-label">반응식</span>
            <strong>{reaction.equation}</strong>
            <span className="equation-label">알짜 이온식</span>
            <strong>{reaction.netIonicEquation}</strong>
            <small>{reaction.subtitleKo}</small>
          </div>

          <div className="panel-heading panel-heading-compact">
            <div>
              <h3 id="timeline-title">반응 타임라인</h3>
              <p>단계를 눌러 이동하세요</p>
            </div>
            <span className="panel-index">
              {activeStepIndex + 1}/{reaction.steps.length}
            </span>
          </div>
          <ol className="timeline-list">
            {reaction.steps.map((step, index) => (
              <li key={step.at}>
                <button
                  type="button"
                  className={`timeline-step${index === activeStepIndex ? ' is-active' : ''}`}
                  onClick={() => jumpAndSync(step.at)}
                  aria-current={index === activeStepIndex ? 'step' : undefined}
                >
                  <span className="timeline-number">{index + 1}</span>
                  <span className="timeline-copy">
                    <strong>{step.titleKo}</strong>
                    <small>{Math.round(step.at * 100)}% 지점</small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="timeline-detail" aria-live="polite">
            <span>지금 장면</span>
            <p>{completed ? reaction.observationKo : activeStep.detailKo}</p>
          </div>
          <div className="observation-card">
            <span>관찰 포인트</span>
            <p>{reaction.observationKo}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
