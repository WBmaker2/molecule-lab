import type { CSSProperties } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { Phase } from '../chem/types';
import { ParticleStage } from '../scene/ParticleStage';
import { useSimStore } from '../stores/simStore';
import {
  MAX_TEMPERATURE,
  MIN_TEMPERATURE,
  MELTING_POINT,
  BOILING_POINT,
  PHASE_INFO,
  phaseForTemperature,
  volumeForTemperature,
} from '../sim/temperature';
import { CoolIcon, HeatIcon, PauseIcon, PlayIcon } from './icons';

export function StatesView() {
  const temperature = useSimStore((state) => state.temperature);
  const particleCount = useSimStore((state) => state.particleCount);
  const paused = useSimStore((state) => state.paused);
  const metrics = useSimStore((state) => state.metrics);
  const setTemperature = useSimStore((state) => state.setTemperature);
  const setParticleCount = useSimStore((state) => state.setParticleCount);
  const togglePaused = useSimStore((state) => state.togglePaused);
  const setMetrics = useSimStore((state) => state.setMetrics);
  const [autoMode, setAutoMode] = useState<'heat' | 'cool' | null>(null);
  const phase = PHASE_INFO[phaseForTemperature(temperature)];
  const volume = volumeForTemperature(temperature);
  const volumePercent = Math.round(volume * 100);
  const tempPercent = ((temperature - MIN_TEMPERATURE) / (MAX_TEMPERATURE - MIN_TEMPERATURE)) * 100;

  useEffect(() => {
    if (!autoMode) return;
    const interval = window.setInterval(() => {
      const current = useSimStore.getState().temperature;
      const next = autoMode === 'heat' ? current + 2 : current - 2;
      if (
        (autoMode === 'heat' && next >= MAX_TEMPERATURE) ||
        (autoMode === 'cool' && next <= MIN_TEMPERATURE)
      ) {
        setTemperature(autoMode === 'heat' ? MAX_TEMPERATURE : MIN_TEMPERATURE);
        setAutoMode(null);
      } else {
        setTemperature(next);
      }
    }, 55);
    return () => window.clearInterval(interval);
  }, [autoMode, setTemperature]);

  const handleMetrics = useCallback(
    (next: { fps: number; order: number; speed: number }) => {
      setMetrics(next);
    },
    [setMetrics],
  );

  const goToPhase = (target: Phase) => {
    setAutoMode(null);
    setTemperature(target === 'solid' ? -10 : target === 'liquid' ? 24 : 112);
  };

  return (
    <section className="view states-view" aria-labelledby="states-title">
      <div className="view-heading">
        <div className="view-heading-copy">
          <span className="view-kicker">상태변화 무대</span>
          <h2 id="states-title">온도가 입자 운동을 바꿉니다</h2>
          <p>
            온도를 낮추면 입자는 제자리에서 규칙적으로 진동하고, 높이면 빠르게 움직이며 공간을
            채웁니다. 상전이 지점을 지나며 배열과 부피가 어떻게 달라지는지 보세요.
          </p>
        </div>
        <div className="state-summary" aria-label="현재 상태 요약">
          <div>
            <span>현재 온도</span>
            <strong>{temperature.toFixed(0)}°C</strong>
          </div>
          <div>
            <span>상태</span>
            <strong>{phase.nameKo}</strong>
          </div>
          <div>
            <span>입자 수</span>
            <strong>{particleCount.toLocaleString('ko-KR')}</strong>
          </div>
        </div>
      </div>

      <div className="states-layout">
        <section className="stage-shell states-stage" aria-labelledby="states-stage-title">
          <div className="stage-topbar">
            <div className="stage-heading">
              <span>입자 무대</span>
              <h3 id="states-stage-title">물 분자 {particleCount.toLocaleString('ko-KR')}개</h3>
            </div>
            <div className="stage-tools">
              <span className={`live-chip${paused ? ' is-paused' : ''}`}>
                <i aria-hidden="true" />
                {paused ? '일시정지' : '실시간'}
              </span>
              <button
                type="button"
                className={`tool-toggle${paused ? ' is-on' : ''}`}
                aria-pressed={paused}
                onClick={togglePaused}
              >
                {paused ? <PlayIcon /> : <PauseIcon />}
                {paused ? '재생' : '일시정지'}
              </button>
            </div>
          </div>
          <div className="stage-canvas states-canvas">
            <ParticleStage
              temperature={temperature}
              count={particleCount}
              paused={paused}
              onMetrics={handleMetrics}
            />
            <div className="phase-overlay" aria-hidden="true">
              <span>{phase.nameKo}</span>
              <strong>{temperature.toFixed(0)}°C</strong>
              <small>{phase.motionKo}</small>
            </div>
            <div className="volume-overlay" aria-hidden="true">
              <span>상대 부피</span>
              <strong>{volumePercent}%</strong>
              <div className="volume-track">
                <i style={{ width: `${Math.min(100, (volume / 1.4) * 100)}%` }} />
              </div>
            </div>
          </div>
          <div className="stage-status">
            <span className="stage-hint">
              <i aria-hidden="true" /> 입자는 물 분자 하나를 점으로 표현한 개념 모형입니다
            </span>
            <span className="stage-count">
              0°C 융해 · 100°C 끓음 · {metrics.fps > 0 ? `${metrics.fps} fps` : '측정 중'}
            </span>
          </div>
        </section>

        <aside className="panel sim-panel" aria-label="상태변화 조작">
          <div className="temp-card">
            <div className="panel-heading panel-heading-compact">
              <div>
                <h3>온도 조절</h3>
                <p>슬라이더를 움직여 상전이를 관찰하세요</p>
              </div>
              <span className="temp-icon" aria-hidden="true">
                <HeatIcon />
              </span>
            </div>
            <div className="temp-readout">
              <strong>{temperature.toFixed(0)}°</strong>
              <span>{phase.nameKo}</span>
            </div>
            <label className="sr-only" htmlFor="temperature-range">
              온도 (섭씨)
            </label>
            <input
              id="temperature-range"
              className="range range-temperature"
              type="range"
              min={MIN_TEMPERATURE}
              max={MAX_TEMPERATURE}
              step={1}
              value={temperature}
              aria-valuetext={`${temperature.toFixed(0)}도, ${phase.nameKo}`}
              style={{ '--temp-pct': `${tempPercent}%` } as CSSProperties}
              onChange={(event) => {
                setAutoMode(null);
                setTemperature(Number(event.target.value));
              }}
            />
            <div className="range-ticks" aria-hidden="true">
              <span>{MIN_TEMPERATURE}°</span>
              <span className={temperature < MELTING_POINT ? 'is-active' : ''}>0° 융해</span>
              <span className={temperature >= BOILING_POINT ? 'is-active' : ''}>100° 끓음</span>
              <span>{MAX_TEMPERATURE}°</span>
            </div>
            <div className="temp-actions">
              <button
                type="button"
                className={`btn btn-secondary btn-pulse${autoMode === 'heat' ? ' is-active' : ''}`}
                onClick={() => setAutoMode(autoMode === 'heat' ? null : 'heat')}
              >
                <HeatIcon />
                {autoMode === 'heat' ? '가열 멈추기' : '천천히 가열'}
              </button>
              <button
                type="button"
                className={`btn btn-secondary${autoMode === 'cool' ? ' is-active' : ''}`}
                onClick={() => setAutoMode(autoMode === 'cool' ? null : 'cool')}
              >
                <CoolIcon />
                {autoMode === 'cool' ? '냉각 멈추기' : '천천히 냉각'}
              </button>
            </div>
          </div>

          <div className="phase-switcher" role="group" aria-label="상태 바로 보기">
            {(['solid', 'liquid', 'gas'] as Phase[]).map((value) => {
              const info = PHASE_INFO[value];
              return (
                <button
                  key={value}
                  type="button"
                  className={`phase-button${phase.phase === value ? ' is-active' : ''}`}
                  aria-pressed={phase.phase === value}
                  onClick={() => goToPhase(value)}
                >
                  <span>{info.nameKo}</span>
                  <small>{info.summaryKo}</small>
                </button>
              );
            })}
          </div>

          <div className="phase-description">
            <span className="phase-description-label">{phase.motionKo}</span>
            <p>{phase.descriptionKo}</p>
          </div>

          <div className="sim-metrics" aria-label="시뮬레이션 지표">
            <div>
              <span>질서도</span>
              <strong>{Math.round(metrics.order * 100)}%</strong>
              <div className="meter-track" aria-hidden="true">
                <i style={{ width: `${metrics.order * 100}%` }} />
              </div>
            </div>
            <div>
              <span>평균 속력</span>
              <strong>{metrics.speed.toFixed(2)}</strong>
            </div>
            <div>
              <span>렌더링</span>
              <strong>{metrics.fps > 0 ? `${metrics.fps} fps` : '—'}</strong>
            </div>
          </div>

          <div className="particle-control">
            <div className="panel-heading panel-heading-compact">
              <div>
                <h3>입자 수</h3>
                <p>최대 2,000개까지 비교할 수 있습니다</p>
              </div>
              <span className="panel-index">{particleCount.toLocaleString('ko-KR')}</span>
            </div>
            <label className="sr-only" htmlFor="particle-count-range">
              입자 수
            </label>
            <input
              id="particle-count-range"
              className="range"
              type="range"
              min={200}
              max={2000}
              step={50}
              value={particleCount}
              aria-valuetext={`${particleCount}개`}
              onChange={(event) => setParticleCount(Number(event.target.value))}
            />
            <div className="particle-quick" role="group" aria-label="입자 수 빠른 선택">
              {[200, 1000, 1500, 2000].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={particleCount === value ? 'is-active' : ''}
                  aria-pressed={particleCount === value}
                  onClick={() => setParticleCount(value)}
                >
                  {value.toLocaleString('ko-KR')}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
