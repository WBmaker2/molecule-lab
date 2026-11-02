import { describe, expect, it } from 'vitest';
import {
  bondOrderSignature,
  canSetBondOrder,
  computeBondAngles,
  computePolarity,
  displayFormula,
  evaluateTarget,
  evaluateTargetGeometry,
  formulaForAtoms,
  lonePairCount,
  moleculeBondOrderSignature,
  moleculeFormula,
  valenceUsage,
} from '../../chem/analysis';
import { connectionDirection, findSnapHost, SINGLE_BOND_LENGTH } from '../../chem/bondRules';
import { getMolecule, MOLECULES } from '../../chem/molecules';
import type { Atom, Bond, MoleculeData, Vec3 } from '../../chem/types';

function atomsFromMolecule(molecule: MoleculeData): Atom[] {
  return molecule.atoms.map((atom, index) => ({
    id: `a${index + 1}`,
    element: atom.element,
    position: [...atom.position] as Vec3,
  }));
}

function bondsFromMolecule(molecule: MoleculeData): Bond[] {
  return molecule.bonds.map((bond, index) => ({
    id: `b${index + 1}`,
    a: `a${bond.a + 1}`,
    b: `a${bond.b + 1}`,
    order: bond.order,
    ionic: bond.ionic,
  }));
}

function atom(id: string, element: Atom['element'], position: Vec3): Atom {
  return { id, element, position };
}

describe('molecule library data', () => {
  it('contains twelve valid specimens with matching formulas', () => {
    expect(MOLECULES).toHaveLength(12);
    expect(new Set(MOLECULES.map((molecule) => molecule.id)).size).toBe(12);
    for (const molecule of MOLECULES) {
      expect(molecule.atoms.length).toBeGreaterThan(0);
      for (const bond of molecule.bonds) {
        expect(molecule.atoms[bond.a]).toBeDefined();
        expect(molecule.atoms[bond.b]).toBeDefined();
        expect(bond.a).not.toBe(bond.b);
      }
      expect(moleculeFormula(molecule)).toBe(molecule.formula);
      expect(molecule.descriptionKo.length).toBeGreaterThan(20);
      expect(molecule.factKo.length).toBeGreaterThan(10);
    }
  });

  it('formats subscripts for chemistry display', () => {
    expect(displayFormula('H2O')).toBe('H₂O');
    expect(displayFormula('C2H4')).toBe('C₂H₄');
    expect(displayFormula('NaCl')).toBe('NaCl');
  });
});

describe('bond angles', () => {
  it('measures the water bond angle at 104.5 degrees', () => {
    const molecule = getMolecule('h2o');
    const angles = computeBondAngles(atomsFromMolecule(molecule), bondsFromMolecule(molecule));
    expect(angles).toHaveLength(1);
    expect(angles[0].angle).toBeGreaterThanOrEqual(104.4);
    expect(angles[0].angle).toBeLessThanOrEqual(104.6);
  });

  it('measures linear and tetrahedral reference angles', () => {
    const co2 = getMolecule('co2');
    const co2Angles = computeBondAngles(atomsFromMolecule(co2), bondsFromMolecule(co2));
    expect(co2Angles[0].angle).toBe(180);
    const methane = getMolecule('ch4');
    const methaneAngles = computeBondAngles(atomsFromMolecule(methane), bondsFromMolecule(methane));
    expect(methaneAngles[0].angle).toBeCloseTo(109.5, 1);
  });
});

describe('polarity', () => {
  it('distinguishes bent polar water from linear nonpolar carbon dioxide', () => {
    const water = getMolecule('h2o');
    const waterPolarity = computePolarity(atomsFromMolecule(water), bondsFromMolecule(water));
    expect(waterPolarity.isPolar).toBe(true);
    expect(waterPolarity.labelKo).toBe('극성');

    const carbonDioxide = getMolecule('co2');
    const carbonDioxidePolarity = computePolarity(
      atomsFromMolecule(carbonDioxide),
      bondsFromMolecule(carbonDioxide),
    );
    expect(carbonDioxidePolarity.isPolar).toBe(false);
    expect(carbonDioxidePolarity.labelKo).toBe('무극성');
  });
});

describe('target formula checking', () => {
  const target = getMolecule('h2o');

  it('accepts a bonded H2O molecule only when two hydrogen atoms and one oxygen atom are connected', () => {
    const oxygen = atom('o', 'O', [0, 0, 0]);
    const hydrogen1 = atom('h1', 'H', [1.18, 0.92, 0]);
    const hydrogen2 = atom('h2', 'H', [-1.18, 0.92, 0]);
    const bonds: Bond[] = [
      { id: 'b1', a: 'o', b: 'h1', order: 1 },
      { id: 'b2', a: 'o', b: 'h2', order: 1 },
    ];
    const verdict = evaluateTarget([oxygen, hydrogen1, hydrogen2], bonds, target);
    expect(formulaForAtoms([oxygen, hydrogen1, hydrogen2])).toBe('H2O');
    expect(verdict.status).toBe('complete');
    expect(verdict.complete).toBe(true);
  });

  it('rejects unbonded H2O atoms', () => {
    const atoms = [
      atom('o', 'O', [0, 0, 0]),
      atom('h1', 'H', [2, 0, 0]),
      atom('h2', 'H', [-2, 0, 0]),
    ];
    const verdict = evaluateTarget(atoms, [], target);
    expect(verdict.status).toBe('missing-bonds');
    expect(verdict.complete).toBe(false);
  });

  it('rejects an extra hydrogen atom', () => {
    const atoms = [
      atom('o', 'O', [0, 0, 0]),
      atom('h1', 'H', [1.18, 0.92, 0]),
      atom('h2', 'H', [-1.18, 0.92, 0]),
      atom('h3', 'H', [0, -1.5, 0]),
    ];
    const bonds: Bond[] = [
      { id: 'b1', a: 'o', b: 'h1', order: 1 },
      { id: 'b2', a: 'o', b: 'h2', order: 1 },
    ];
    const verdict = evaluateTarget(atoms, bonds, target);
    expect(verdict.status).toBe('extra-atoms');
  });

  it('rejects a hydrogen-hydrogen chain with the same atoms and bond count', () => {
    const atoms = [
      atom('o', 'O', [0, 0, 0]),
      atom('h1', 'H', [1.5, 0, 0]),
      atom('h2', 'H', [3, 0, 0]),
    ];
    const bonds: Bond[] = [
      { id: 'b1', a: 'h1', b: 'h2', order: 1 },
      { id: 'b2', a: 'o', b: 'h1', order: 1 },
    ];
    const verdict = evaluateTarget(atoms, bonds, target);
    expect(verdict.status).toBe('wrong-arrangement');
  });
});

describe('target geometry checking', () => {
  it('rejects a bent free-built CO2 molecule as wrong geometry', () => {
    const atoms = [
      atom('c', 'C', [0, 0, 0]),
      atom('o1', 'O', [1.2, 0.8, 0]),
      atom('o2', 'O', [-1.2, 0.8, 0]),
    ];
    const bonds: Bond[] = [
      { id: 'b1', a: 'c', b: 'o1', order: 1 },
      { id: 'b2', a: 'c', b: 'o2', order: 1 },
    ];
    expect(evaluateTarget(atoms, bonds, getMolecule('co2')).status).toBe('wrong-geometry');
  });

  it('requires target bond orders for completion', () => {
    const target = getMolecule('co2');
    const atoms = [
      atom('c', 'C', [0, 0, 0]),
      atom('o1', 'O', [1.35, 0, 0]),
      atom('o2', 'O', [-1.35, 0, 0]),
    ];
    const singleBonds: Bond[] = [
      { id: 'b1', a: 'c', b: 'o1', order: 1 },
      { id: 'b2', a: 'c', b: 'o2', order: 1 },
    ];
    expect(evaluateTarget(atoms, singleBonds, target).complete).toBe(false);
    const doubleBonds: Bond[] = [
      { id: 'b1', a: 'c', b: 'o1', order: 2 },
      { id: 'b2', a: 'c', b: 'o2', order: 2 },
    ];
    expect(bondOrderSignature(atoms, doubleBonds)).toEqual(moleculeBondOrderSignature(target));
    expect(evaluateTarget(atoms, doubleBonds, target).complete).toBe(true);
  });

  it('matches geometry for an ideal guided molecule', () => {
    const target = getMolecule('h2o');
    const atoms = [
      atom('o', 'O', [0, 0, 0]),
      atom('h1', 'H', [1.18604, 0.91834, 0]),
      atom('h2', 'H', [-1.18604, 0.91834, 0]),
    ];
    const bonds: Bond[] = [
      { id: 'b1', a: 'o', b: 'h1', order: 1 },
      { id: 'b2', a: 'o', b: 'h2', order: 1 },
    ];
    const geometry = evaluateTargetGeometry(atoms, bonds, target);
    expect(geometry.status).toBe('match');
    expect(geometry.maxDeviationDeg).toBeLessThanOrEqual(4);
  });
});

describe('valence and lone pairs', () => {
  it('tracks bond-order-weighted valence use', () => {
    const atoms = [
      atom('c', 'C', [0, 0, 0]),
      atom('o1', 'O', [1.35, 0, 0]),
      atom('o2', 'O', [-1.35, 0, 0]),
    ];
    const bonds: Bond[] = [
      { id: 'b1', a: 'c', b: 'o1', order: 2 },
      { id: 'b2', a: 'c', b: 'o2', order: 2 },
    ];
    const usage = valenceUsage(atoms, bonds);
    expect(usage.c).toBe(4);
    expect(usage.o1).toBe(2);
    expect(canSetBondOrder(atoms, bonds, 'b1', 3).ok).toBe(false);
  });

  it('counts lone pairs for classroom atoms', () => {
    expect(lonePairCount('O', 2)).toBe(2);
    expect(lonePairCount('N', 3)).toBe(1);
    expect(lonePairCount('H', 1)).toBe(0);
  });
});

describe('snap assembly rules', () => {
  it('snaps a hydrogen onto an oxygen socket at one bond length', () => {
    const oxygen = atom('o', 'O', [0, 0, 0]);
    const hydrogen = atom('h', 'H', [1, 0.9, 0]);
    const result = findSnapHost(hydrogen, [oxygen, hydrogen], []);
    expect(result).not.toBeNull();
    expect(result?.host.id).toBe('o');
    const distance = Math.hypot(...result!.position);
    expect(distance).toBeCloseTo(SINGLE_BOND_LENGTH, 4);
  });

  it('does not let a terminal hydrogen host an oxygen atom', () => {
    const hydrogen = atom('h', 'H', [0, 0, 0]);
    const oxygen = atom('o', 'O', [1.1, 0, 0]);
    const result = findSnapHost(oxygen, [hydrogen, oxygen], []);
    expect(result).toBeNull();
  });

  it('supports attaching in either direction through the bond helper', () => {
    const oxygen = atom('o', 'O', [0, 0, 0]);
    const hydrogen = atom('h', 'H', [2.4, 0, 0]);
    expect(connectionDirection(oxygen, hydrogen, [])).toBe('other-to-selected');
    expect(connectionDirection(hydrogen, oxygen, [])).toBe('selected-to-other');
  });
});
