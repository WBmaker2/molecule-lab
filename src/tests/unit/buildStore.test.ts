import { beforeEach, describe, expect, it } from 'vitest';
import { computeBondAngles, evaluateTarget } from '../../chem/analysis';
import { getMolecule } from '../../chem/molecules';
import { useBuildStore } from '../../stores/buildStore';

describe('guided target assembly', () => {
  beforeEach(() => {
    useBuildStore.getState().loadMolecule('h2o', 'target');
  });

  it('connects H2O through the accessible bond helper', () => {
    const store = useBuildStore.getState();
    store.bondSelectedTo('a2');
    expect(useBuildStore.getState().bonds).toHaveLength(1);
    expect(useBuildStore.getState().selectedAtomId).toBe('a1');
    useBuildStore.getState().bondSelectedTo('a3');
    const state = useBuildStore.getState();
    const verdict = evaluateTarget(state.atoms, state.bonds, getMolecule('h2o'));
    expect(verdict.complete).toBe(true);
    const angles = computeBondAngles(state.atoms, state.bonds);
    expect(angles[0].angle).toBeCloseTo(104.5, 1);
  });

  it('reproduces linear CO2 geometry with double bonds', () => {
    useBuildStore.getState().loadMolecule('co2', 'target');
    useBuildStore.getState().bondSelectedTo('a2');
    useBuildStore.getState().bondSelectedTo('a3');
    const state = useBuildStore.getState();
    const verdict = evaluateTarget(state.atoms, state.bonds, getMolecule('co2'));
    expect(verdict.complete).toBe(true);
    expect(state.bonds.every((bond) => bond.order === 2)).toBe(true);
    const angles = computeBondAngles(state.atoms, state.bonds);
    expect(angles[0].angle).toBe(180);
  });

  it('walks through both carbon centres when building ethene', () => {
    useBuildStore.getState().loadMolecule('c2h4', 'target');
    useBuildStore.getState().bondSelectedTo('a2');
    useBuildStore.getState().bondSelectedTo('a3');
    useBuildStore.getState().bondSelectedTo('a4');
    expect(useBuildStore.getState().selectedAtomId).toBe('a2');
    useBuildStore.getState().bondSelectedTo('a5');
    useBuildStore.getState().bondSelectedTo('a6');
    const state = useBuildStore.getState();
    const verdict = evaluateTarget(state.atoms, state.bonds, getMolecule('c2h4'));
    expect(verdict.complete).toBe(true);
    expect(state.bonds.filter((bond) => bond.order === 2)).toHaveLength(1);
    const angles = computeBondAngles(state.atoms, state.bonds);
    expect(angles.every((angle) => Math.abs(angle.angle - 120) < 0.2)).toBe(true);
  });
});
