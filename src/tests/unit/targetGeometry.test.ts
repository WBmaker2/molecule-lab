import { describe, expect, it } from 'vitest';
import { targetRelativePosition } from '../../chem/targetGeometry';
import type { Atom, Vec3 } from '../../chem/types';

function stagedAtom(id: string, element: Atom['element'], position: Vec3, targetIndex: number): Atom {
  return { id, element, position, targetIndex };
}

describe('target-relative geometry', () => {
  it('maps a guided hydrogen to the ideal water socket', () => {
    const moving = stagedAtom('h', 'H', [2.4, 1.8, 0], 1);
    const anchor = stagedAtom('o', 'O', [0, 0, 0], 0);
    const result = targetRelativePosition('h2o', moving, anchor);
    expect(result?.order).toBe(1);
    expect(result?.position[0]).toBeCloseTo(1.18604, 4);
  });

  it('returns no geometry for non-target bonds', () => {
    const moving = stagedAtom('h1', 'H', [0, 0, 0], 1);
    const anchor = stagedAtom('h2', 'H', [1, 0, 0], 2);
    expect(targetRelativePosition('h2o', moving, anchor)).toBeNull();
  });
});
