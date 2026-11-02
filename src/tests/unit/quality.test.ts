import { describe, expect, it } from 'vitest';
import { decideQuality } from '../../lib/quality';

describe('render quality', () => {
  it('lowers quality below the interactive threshold and recovers above it', () => {
    expect(decideQuality('high', 28)).toBe('low');
    expect(decideQuality('low', 58)).toBe('high');
    expect(decideQuality('low', 45)).toBe('low');
  });
});
