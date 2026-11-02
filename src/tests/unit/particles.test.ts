import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../../chem/types';
import {
  createParticles,
  particleMetrics,
  particlesAreFinite,
  stepParticles,
} from '../../sim/particles';
import {
  densityNoteKo,
  phaseForTemperature,
  particleColor,
  volumeForTemperature,
  waterDensityKgPerL,
} from '../../sim/temperature';

const BOUNDS: Vec3 = [2.8, 1.65, 1.65];

describe('particle state simulation', () => {
  it('keeps 1500 particles finite and bounded while melting', () => {
    const state = createParticles(1500, BOUNDS, 24);
    for (let frame = 0; frame < 90; frame += 1) {
      stepParticles(state, 1 / 60, 24, BOUNDS);
    }
    expect(particlesAreFinite(state)).toBe(true);
    for (let index = 0; index < state.positions.length; index += 1) {
      expect(Math.abs(state.positions[index])).toBeLessThanOrEqual(BOUNDS[index % 3] + 0.001);
    }
    const metrics = particleMetrics(state);
    expect(metrics.order).toBeGreaterThanOrEqual(0);
    expect(metrics.order).toBeLessThanOrEqual(1);
    expect(metrics.speed).toBeGreaterThan(0);
  });

  it('shows a high order parameter in the solid phase', () => {
    const state = createParticles(800, BOUNDS, -10);
    for (let frame = 0; frame < 120; frame += 1) {
      stepParticles(state, 1 / 60, -10, BOUNDS);
    }
    const metrics = particleMetrics(state);
    expect(metrics.order).toBeGreaterThan(0.7);
    expect(particlesAreFinite(state)).toBe(true);
  });

  it('makes ice larger than liquid water near freezing', () => {
    const cold = volumeForTemperature(-10);
    const warm = volumeForTemperature(24);
    const hot = volumeForTemperature(112);
    expect(cold).toBeGreaterThan(volumeForTemperature(0));
    expect(warm).toBeLessThan(hot);
    expect(cold).toBeLessThan(hot);
  });

  it('reports maximum water density near 4 degrees', () => {
    expect(waterDensityKgPerL(4)).toBeCloseTo(1, 3);
    expect(waterDensityKgPerL(0)).toBeLessThan(waterDensityKgPerL(4));
    expect(densityNoteKo(-10)).toContain('뜹니다');
  });

  it('steps 1500 particles without dropping below the interactive budget', () => {
    const state = createParticles(1500, BOUNDS, 60);
    const start = performance.now();
    const frames = 120;
    for (let frame = 0; frame < frames; frame += 1) {
      stepParticles(state, 1 / 60, 60, BOUNDS);
    }
    const average = (performance.now() - start) / frames;
    expect(average).toBeLessThan(16.7);
  });
});

describe('temperature helpers', () => {
  it('uses the water phase thresholds', () => {
    expect(phaseForTemperature(-20)).toBe('solid');
    expect(phaseForTemperature(0)).toBe('liquid');
    expect(phaseForTemperature(99.9)).toBe('liquid');
    expect(phaseForTemperature(100)).toBe('gas');
    expect(phaseForTemperature(120)).toBe('gas');
  });

  it('returns a valid hex color across the slider range', () => {
    for (const temperature of [-20, 0, 24, 80, 100, 120]) {
      expect(particleColor(temperature)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
