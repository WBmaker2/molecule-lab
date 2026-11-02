import moleculesJson from './molecules.json';
import type { MoleculeData } from './types';

export const MOLECULES = moleculesJson as MoleculeData[];

export const MOLECULE_BY_ID: Record<string, MoleculeData> = Object.fromEntries(
  MOLECULES.map((molecule) => [molecule.id, molecule]),
);

export const MOLECULE_CATEGORIES = ['전체', '생명·환경', '연소·기체', '산·염기', '유기 화학'];

export function getMolecule(id: string): MoleculeData {
  return MOLECULE_BY_ID[id] ?? MOLECULES[0];
}

export function centralAtomIndex(molecule: MoleculeData): number {
  const degrees = molecule.atoms.map(() => 0);
  for (const bond of molecule.bonds) {
    degrees[bond.a] += 1;
    degrees[bond.b] += 1;
  }
  let bestIndex = 0;
  let bestDegree = -1;
  degrees.forEach((degree, index) => {
    if (degree > bestDegree) {
      bestDegree = degree;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export function neighborIndices(molecule: MoleculeData, atomIndex: number): number[] {
  return molecule.bonds
    .filter((bond) => bond.a === atomIndex || bond.b === atomIndex)
    .map((bond) => (bond.a === atomIndex ? bond.b : bond.a));
}
