import { describe, expect, it } from 'vitest';
import { formatHash, parseHash, parseEnumParam, parseIntegerParam } from '../../lib/routes';

describe('teacher preset links', () => {
  it('round-trips teacher preset links', () => {
    const location = parseHash('#/states?temp=112&count=1500');
    expect(location).toEqual({ view: 'states', params: { temp: '112', count: '1500' } });
    expect(parseHash(formatHash(location))).toEqual(location);
  });

  it('understands legacy hashes and reaction paths', () => {
    expect(parseHash('#states')).toEqual({ view: 'states', params: {} });
    expect(parseHash('#/reactions/precipitation?t=1')).toEqual({
      view: 'reactions',
      params: { id: 'precipitation', t: '1' },
    });
    expect(parseHash('#unknown')).toEqual({ view: 'build', params: {} });
  });

  it('validates numeric and enum parameters', () => {
    expect(parseIntegerParam({ temp: '112' }, 'temp', 24, -20, 120)).toBe(112);
    expect(parseIntegerParam({ temp: 'hot' }, 'temp', 24, -20, 120)).toBe(24);
    expect(parseEnumParam({ mode: 'complete' }, 'mode', ['target', 'complete'] as const, 'target')).toBe(
      'complete',
    );
    expect(parseEnumParam({ mode: 'nope' }, 'mode', ['target', 'complete'] as const, 'target')).toBe(
      'target',
    );
  });
});
