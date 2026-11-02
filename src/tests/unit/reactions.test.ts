import { describe, expect, it } from 'vitest';
import { REACTIONS } from '../../chem/reactions';
import { actorOpacity, clamp01, sampleKeyframes, smoothstep } from '../../lib/timeline';

describe('reaction timelines', () => {
  it('contains the two required reaction scenes', () => {
    expect(REACTIONS.map((reaction) => reaction.id)).toEqual(['neutralization', 'precipitation']);
    for (const reaction of REACTIONS) {
      expect(reaction.equation.length).toBeGreaterThan(5);
      expect(reaction.steps.length).toBeGreaterThanOrEqual(3);
      expect(reaction.actors.length).toBeGreaterThanOrEqual(4);
      const times = reaction.steps.map((step) => step.at);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
      expect(times[0]).toBe(0);
      expect(times[times.length - 1]).toBeLessThan(1);
      expect(reaction.duration).toBeGreaterThan(0);
    }
  });

  it('completes every actor and product timeline without NaN', () => {
    for (const reaction of REACTIONS) {
      for (let step = 0; step <= 100; step += 1) {
        const progress = step / 100;
        for (const actor of reaction.actors) {
          const position = sampleKeyframes(actor.keyframes, progress);
          expect(position.every((value) => Number.isFinite(value))).toBe(true);
          const opacity = actorOpacity(actor, progress);
          expect(Number.isFinite(opacity)).toBe(true);
          expect(opacity).toBeGreaterThanOrEqual(0);
          expect(opacity).toBeLessThanOrEqual(1);
        }
        for (const product of reaction.products ?? []) {
          const position = sampleKeyframes(product.keyframes, progress);
          expect(position.every((value) => Number.isFinite(value))).toBe(true);
        }
      }
    }
  });

  it('handles clamped and non-finite progress safely', () => {
    const first = REACTIONS[0].actors[0];
    expect(sampleKeyframes(first.keyframes, -1)).toEqual(first.keyframes[0].pos);
    const last = first.keyframes[first.keyframes.length - 1].pos;
    expect(sampleKeyframes(first.keyframes, 2)).toEqual(last);
    expect(sampleKeyframes(first.keyframes, Number.NaN)).toEqual(first.keyframes[0].pos);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 5);
  });
});
