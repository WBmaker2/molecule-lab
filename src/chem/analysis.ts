import { degreesBetween, normalize, sub } from './bondRules';
import { ELEMENTS } from './elements';
import type { Atom, Bond, ElementSymbol, MoleculeData, Vec3 } from './types';

const ELEMENT_ORDER: ElementSymbol[] = ['C', 'N', 'H', 'Na', 'S', 'Cl', 'O', 'Ag'];

const SUBSCRIPT_DIGITS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

export type Composition = Partial<Record<ElementSymbol, number>>;

export interface BondAngle {
  atomId: string;
  firstNeighborId: string;
  secondNeighborId: string;
  angle: number;
}

export interface BondDipole {
  from: Vec3;
  to: Vec3;
  strength: number;
  order: 1 | 2 | 3;
}

export interface PolarityResult {
  magnitude: number;
  vector: Vec3;
  isPolar: boolean;
  labelKo: string;
  bondDipoles: BondDipole[];
}

export interface ComponentAnalysis {
  atomIds: string[];
  bondIds: string[];
  formula: string;
  displayFormula: string;
  composition: Composition;
  atoms: Atom[];
  bonds: Bond[];
}

export interface MoleculeAnalysis {
  formula: string;
  displayFormula: string;
  composition: Composition;
  atomCount: number;
  bondCount: number;
  components: number;
  allConnected: boolean;
  angles: BondAngle[];
  polarity: PolarityResult;
  degrees: Record<string, number>;
}

export type TargetStatus =
  | 'empty'
  | 'missing-atoms'
  | 'extra-atoms'
  | 'missing-bonds'
  | 'disconnected'
  | 'wrong-arrangement'
  | 'complete';

export interface ElementProgress {
  element: ElementSymbol;
  current: number;
  target: number;
}

export interface TargetVerdict {
  status: TargetStatus;
  complete: boolean;
  messageKo: string;
  hintKo: string;
  targetFormula: string;
  targetDisplayFormula: string;
  currentDisplayFormula: string;
  progress: ElementProgress[];
}

export function compositionOf(atoms: Atom[]): Composition {
  const composition: Composition = {};
  for (const atom of atoms) {
    composition[atom.element] = (composition[atom.element] ?? 0) + 1;
  }
  return composition;
}

export function formulaForComposition(composition: Composition): string {
  return ELEMENT_ORDER.filter((symbol) => (composition[symbol] ?? 0) > 0)
    .map((symbol) => `${symbol}${(composition[symbol] ?? 1) > 1 ? composition[symbol] : ''}`)
    .join('');
}

export function displayFormula(formula: string): string {
  return formula.replace(/\d/g, (digit) => SUBSCRIPT_DIGITS[Number(digit)] ?? digit);
}

export function formulaForAtoms(atoms: Atom[]): string {
  return formulaForComposition(compositionOf(atoms));
}

export function moleculeFormula(molecule: MoleculeData): string {
  const composition: Composition = {};
  for (const atom of molecule.atoms) {
    composition[atom.element] = (composition[atom.element] ?? 0) + 1;
  }
  return formulaForComposition(composition);
}

export function moleculeBondSignature(molecule: MoleculeData): string[] {
  const counts = new Map<string, number>();
  for (const bond of molecule.bonds) {
    const first = molecule.atoms[bond.a]?.element;
    const second = molecule.atoms[bond.b]?.element;
    if (!first || !second) continue;
    const key = [first, second].sort().join('–');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => `${key}:${count}`);
}

export function bondSignature(atoms: Atom[], bonds: Bond[]): string[] {
  const byId = new Map(atoms.map((atom) => [atom.id, atom]));
  const counts = new Map<string, number>();
  for (const bond of bonds) {
    const first = byId.get(bond.a)?.element;
    const second = byId.get(bond.b)?.element;
    if (!first || !second) continue;
    const key = [first, second].sort().join('–');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => `${key}:${count}`);
}

export function connectedComponents(
  atoms: Atom[],
  bonds: Bond[],
): { atomIds: string[]; bondIds: string[] }[] {
  const adjacency = new Map<string, string[]>();
  for (const atom of atoms) adjacency.set(atom.id, []);
  for (const bond of bonds) {
    adjacency.get(bond.a)?.push(bond.b);
    adjacency.get(bond.b)?.push(bond.a);
  }
  const visited = new Set<string>();
  const components: { atomIds: string[]; bondIds: string[] }[] = [];
  for (const atom of atoms) {
    if (visited.has(atom.id)) continue;
    const atomIds: string[] = [];
    const queue = [atom.id];
    visited.add(atom.id);
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      atomIds.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    const idSet = new Set(atomIds);
    const bondIds = bonds
      .filter((bond) => idSet.has(bond.a) && idSet.has(bond.b))
      .map((bond) => bond.id);
    components.push({ atomIds, bondIds });
  }
  return components;
}

export function componentFor(
  atomId: string | null,
  atoms: Atom[],
  bonds: Bond[],
): ComponentAnalysis | null {
  if (!atomId) return null;
  const components = connectedComponents(atoms, bonds);
  const found = components.find((component) => component.atomIds.includes(atomId));
  if (!found) return null;
  const atomIds = new Set(found.atomIds);
  const bondIds = new Set(found.bondIds);
  const componentAtoms = atoms.filter((atom) => atomIds.has(atom.id));
  const componentBonds = bonds.filter((bond) => bondIds.has(bond.id));
  const composition = compositionOf(componentAtoms);
  const formula = formulaForComposition(composition);
  return {
    atomIds: found.atomIds,
    bondIds: found.bondIds,
    formula,
    displayFormula: displayFormula(formula),
    composition,
    atoms: componentAtoms,
    bonds: componentBonds,
  };
}

export function computeBondAngles(atoms: Atom[], bonds: Bond[]): BondAngle[] {
  const byId = new Map(atoms.map((atom) => [atom.id, atom]));
  const results: BondAngle[] = [];
  for (const atom of atoms) {
    const neighbors = bonds
      .filter((bond) => bond.a === atom.id || bond.b === atom.id)
      .map((bond) => (bond.a === atom.id ? bond.b : bond.a))
      .filter((id) => byId.has(id));
    if (neighbors.length < 2) continue;
    for (let first = 0; first < neighbors.length; first += 1) {
      for (let second = first + 1; second < neighbors.length; second += 1) {
        const firstAtom = byId.get(neighbors[first]);
        const secondAtom = byId.get(neighbors[second]);
        if (!firstAtom || !secondAtom) continue;
        const firstVector = sub(firstAtom.position, atom.position);
        const secondVector = sub(secondAtom.position, atom.position);
        results.push({
          atomId: atom.id,
          firstNeighborId: firstAtom.id,
          secondNeighborId: secondAtom.id,
          angle: Math.round(degreesBetween(firstVector, secondVector) * 10) / 10,
        });
      }
    }
  }
  return results;
}

export function computePolarity(atoms: Atom[], bonds: Bond[]): PolarityResult {
  const byId = new Map(atoms.map((atom) => [atom.id, atom]));
  const bondDipoles: BondDipole[] = [];
  let x = 0;
  let y = 0;
  let z = 0;
  let hasIonic = false;
  for (const bond of bonds) {
    const first = byId.get(bond.a);
    const second = byId.get(bond.b);
    if (!first || !second) continue;
    if (bond.ionic) hasIonic = true;
    const firstEn = ELEMENTS[first.element].electronegativity;
    const secondEn = ELEMENTS[second.element].electronegativity;
    const difference = secondEn - firstEn;
    if (Math.abs(difference) < 0.02) continue;
    const lower = difference > 0 ? first : second;
    const higher = difference > 0 ? second : first;
    const direction = normalize(sub(higher.position, lower.position));
    const orderFactor = bond.order === 3 ? 1.4 : bond.order === 2 ? 1.2 : 1;
    const strength = (Math.abs(difference) * orderFactor + (bond.ionic ? 0.9 : 0)) * 0.62;
    x += direction[0] * strength;
    y += direction[1] * strength;
    z += direction[2] * strength;
    bondDipoles.push({
      from: lower.position,
      to: higher.position,
      strength,
      order: bond.order,
    });
  }
  const magnitude = Math.hypot(x, y, z);
  const labelKo = hasIonic ? '이온성' : magnitude > 0.35 ? '극성' : '무극성';
  return {
    magnitude: Math.round(magnitude * 100) / 100,
    vector: [x, y, z],
    isPolar: magnitude > 0.35,
    labelKo,
    bondDipoles,
  };
}

export function analyzeMolecule(atoms: Atom[], bonds: Bond[]): MoleculeAnalysis {
  const composition = compositionOf(atoms);
  const formula = formulaForComposition(composition);
  const components = connectedComponents(atoms, bonds);
  const degrees: Record<string, number> = {};
  for (const atom of atoms) degrees[atom.id] = 0;
  for (const bond of bonds) {
    degrees[bond.a] = (degrees[bond.a] ?? 0) + 1;
    degrees[bond.b] = (degrees[bond.b] ?? 0) + 1;
  }
  return {
    formula,
    displayFormula: displayFormula(formula),
    composition,
    atomCount: atoms.length,
    bondCount: bonds.length,
    components: components.length,
    allConnected: atoms.length > 0 && components.length === 1,
    angles: computeBondAngles(atoms, bonds),
    polarity: computePolarity(atoms, bonds),
    degrees,
  };
}

export function countDifference(atoms: Atom[], target: MoleculeData): ElementProgress[] {
  const current = compositionOf(atoms);
  const targetComposition = compositionOf(
    target.atoms.map((atom, index) => ({
      id: `target-${index}`,
      element: atom.element,
      position: atom.position,
    })),
  );
  const symbols = new Set<ElementSymbol>([
    ...(Object.keys(current) as ElementSymbol[]),
    ...(Object.keys(targetComposition) as ElementSymbol[]),
  ]);
  return ELEMENT_ORDER.filter((symbol) => symbols.has(symbol)).map((symbol) => ({
    element: symbol,
    current: current[symbol] ?? 0,
    target: targetComposition[symbol] ?? 0,
  }));
}

export function evaluateTarget(atoms: Atom[], bonds: Bond[], target: MoleculeData): TargetVerdict {
  const targetFormula = moleculeFormula(target);
  const currentFormula = formulaForAtoms(atoms);
  const targetDisplay = displayFormula(targetFormula);
  const currentDisplay = displayFormula(currentFormula);
  const progress = countDifference(atoms, target);
  if (atoms.length === 0) {
    return {
      status: 'empty',
      complete: false,
      messageKo: '실험대가 비어 있어요',
      hintKo: `목표인 ${target.nameKo}(${targetDisplay})의 원자를 먼저 놓아 보세요.`,
      targetFormula,
      targetDisplayFormula: targetDisplay,
      currentDisplayFormula: currentDisplay,
      progress,
    };
  }
  const missingAtoms = progress.reduce(
    (sum, item) => sum + Math.max(0, item.target - item.current),
    0,
  );
  const extraAtoms = progress.reduce(
    (sum, item) => sum + Math.max(0, item.current - item.target),
    0,
  );
  if (missingAtoms > 0) {
    return {
      status: 'missing-atoms',
      complete: false,
      messageKo: `원자 ${missingAtoms}개가 더 필요해요`,
      hintKo: missingHint(progress),
      targetFormula,
      targetDisplayFormula: targetDisplay,
      currentDisplayFormula: currentDisplay,
      progress,
    };
  }
  if (extraAtoms > 0) {
    return {
      status: 'extra-atoms',
      complete: false,
      messageKo: `원자가 ${extraAtoms}개 많아요`,
      hintKo: '목표 분자에 필요한 원자만 남기고 정리해 보세요.',
      targetFormula,
      targetDisplayFormula: targetDisplay,
      currentDisplayFormula: currentDisplay,
      progress,
    };
  }
  const missingBonds = target.bonds.length - bonds.length;
  if (missingBonds > 0) {
    return {
      status: 'missing-bonds',
      complete: false,
      messageKo: `결합이 ${missingBonds}개 더 필요해요`,
      hintKo: '원자를 다른 원자 가까이로 끌어다 놓거나 결합 도우미를 사용하세요.',
      targetFormula,
      targetDisplayFormula: targetDisplay,
      currentDisplayFormula: currentDisplay,
      progress,
    };
  }
  const components = connectedComponents(atoms, bonds);
  if (components.length > 1) {
    return {
      status: 'disconnected',
      complete: false,
      messageKo: '원자들이 한 덩어리로 연결되어야 해요',
      hintKo: '떨어져 있는 원자 조각을 서로 결합시켜 보세요.',
      targetFormula,
      targetDisplayFormula: targetDisplay,
      currentDisplayFormula: currentDisplay,
      progress,
    };
  }
  const currentSignature = bondSignature(atoms, bonds);
  const targetSignature = moleculeBondSignature(target);
  if (currentSignature.join('|') !== targetSignature.join('|')) {
    return {
      status: 'wrong-arrangement',
      complete: false,
      messageKo: '원자 배열이 목표와 달라요',
      hintKo: '어떤 원자끼리 결합해야 하는지 다시 확인해 보세요.',
      targetFormula,
      targetDisplayFormula: targetDisplay,
      currentDisplayFormula: currentDisplay,
      progress,
    };
  }
  return {
    status: 'complete',
    complete: true,
    messageKo: `${target.nameKo} 완성!`,
    hintKo: `목표 분자 ${targetDisplay}를 정확하게 만들었습니다.`,
    targetFormula,
    targetDisplayFormula: targetDisplay,
    currentDisplayFormula: currentDisplay,
    progress,
  };
}

function missingHint(progress: ElementProgress[]): string {
  const missing = progress.filter((item) => item.current < item.target);
  if (missing.length === 0) return '원자를 더 놓아 보세요.';
  return missing
    .map((item) => `${ELEMENTS[item.element].nameKo} ${item.target - item.current}개`)
    .join(', ')
    .concat('를 더 놓아 보세요.');
}
