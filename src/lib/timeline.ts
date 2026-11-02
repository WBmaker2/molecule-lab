import type { ReactionActor, Vec3 } from '../chem/types';

export function sampleKeyframes(keyframes: { t: number; pos: Vec3 }[], progress: number): Vec3 {
  if (keyframes.length === 0) return [0, 0, 0];
  const clamped = clamp01(progress);
  if (clamped <= keyframes[0].t) return keyframes[0].pos;
  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const current = keyframes[index];
    const next = keyframes[index + 1];
    if (clamped >= current.t && clamped <= next.t) {
      const span = Math.max(0.0001, next.t - current.t);
      const local = smoothstep((clamped - current.t) / span);
      return [
        current.pos[0] + (next.pos[0] - current.pos[0]) * local,
        current.pos[1] + (next.pos[1] - current.pos[1]) * local,
        current.pos[2] + (next.pos[2] - current.pos[2]) * local,
      ];
    }
  }
  return keyframes[keyframes.length - 1].pos;
}

export function actorOpacity(actor: ReactionActor, progress: number): number {
  if (!actor.fadeOut) return 1;
  const [start, end] = actor.fadeOut;
  return 1 - clamp01((progress - start) / Math.max(0.0001, end - start));
}

export function smoothstep(value: number): number {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
