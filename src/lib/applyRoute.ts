import { MOLECULE_BY_ID } from '../chem/molecules';
import { REACTION_BY_ID } from '../chem/reactions';
import { decodeWorkbenchFromHash } from './share';
import { parseEnumParam, parseHash, parseIntegerParam, type RouteLocation } from './routes';
import { useAppStore } from '../stores/appStore';
import { useBuildStore } from '../stores/buildStore';
import { useQuizStore } from '../stores/quizStore';
import { useReactionStore } from '../stores/reactionStore';
import { useSimStore } from '../stores/simStore';

export function applyRoute(location: RouteLocation): void {
  useAppStore.getState().applyLocation(location.view, location.params);
  const params = location.params;
  switch (location.view) {
    case 'build': {
      const build = useBuildStore.getState();
      if (params.data) {
        try {
          build.importWorkbench(decodeWorkbenchFromHash(params.data));
        } catch {
          build.setNotice('공유 링크를 열지 못했습니다.');
        }
        return;
      }
      if (params.target && params.target in MOLECULE_BY_ID) {
        const mode = params.mode === 'complete' ? 'complete' : 'target';
        build.loadMolecule(params.target, mode);
      }
      return;
    }
    case 'states': {
      const sim = useSimStore.getState();
      if (params.temp !== undefined) sim.setTemperature(Number(params.temp));
      if (params.count !== undefined) sim.setParticleCount(Number(params.count));
      if (params.paused !== undefined) sim.setPaused(params.paused === '1');
      if (params.quality !== undefined) {
        sim.setQuality(parseEnumParam(params, 'quality', ['auto', 'high', 'low'] as const, 'auto'));
      }
      return;
    }
    case 'reactions': {
      const reaction = useReactionStore.getState();
      if (params.id && params.id in REACTION_BY_ID && params.id !== reaction.reactionId) {
        reaction.setReaction(params.id);
      }
      if (params.speed !== undefined) {
        const speed = Number(params.speed);
        if (Number.isFinite(speed)) reaction.setSpeed(speed);
      }
      if (params.t !== undefined) {
        const progress = Number(params.t);
        if (Number.isFinite(progress)) reaction.jumpTo(progress);
      }
      return;
    }
    case 'quiz': {
      const quiz = useQuizStore.getState();
      const seed = parseIntegerParam(params, 'seed', quiz.seed, 0, 999999);
      const length = parseIntegerParam(params, 'length', quiz.length, 1, 12);
      if (seed !== quiz.seed || length !== quiz.length) quiz.start(seed, length);
      return;
    }
    default:
      return;
  }
}

export function applyCurrentHash(): void {
  if (typeof window === 'undefined') return;
  applyRoute(parseHash(window.location.hash));
}
