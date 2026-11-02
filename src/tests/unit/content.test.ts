import { describe, expect, it } from 'vitest';
import {
  CONTENT_VERSION,
  validateContent,
  validateIonData,
  validateMoleculeData,
  validateReactionData,
} from '../../chem/content';
import { IONS } from '../../chem/ions';
import { MOLECULES } from '../../chem/molecules';
import { REACTIONS } from '../../chem/reactions';

describe('curriculum content bundle', () => {
  it('uses the expected content version', () => {
    expect(CONTENT_VERSION).toBe('2026.11.03');
  });

  it('accepts the shipped content bundle', () => {
    expect(validateContent()).toEqual([]);
  });

  it('covers every spectator and precipitate ion used by the theater', () => {
    const formulas = new Set(IONS.map((ion) => ion.formula));
    for (const formula of ['H⁺', 'OH⁻', 'Na⁺', 'Cl⁻', 'Ag⁺', 'NO₃⁻']) {
      expect(formulas.has(formula)).toBe(true);
    }
  });

  it('rejects broken molecule, reaction, and ion records', () => {
    expect(
      validateMoleculeData({ ...MOLECULES[0], atoms: [] }).length,
    ).toBeGreaterThan(0);
    expect(
      validateReactionData({ ...REACTIONS[0], steps: [] }).length,
    ).toBeGreaterThan(0);
    expect(validateIonData({ ...IONS[0], reactionIds: ['missing'] }).length).toBeGreaterThan(0);
  });
});
