import { create } from 'zustand';
import {
  add,
  bestPortFor,
  connectionDirection,
  findSnapHost,
  isSameBond,
  portsFor,
  ringPosition,
  scale,
  SINGLE_BOND_LENGTH,
} from '../chem/bondRules';
import { displayFormula } from '../chem/analysis';
import { centralAtomIndex, getMolecule } from '../chem/molecules';
import type { Atom, Bond, ElementSymbol, Vec3 } from '../chem/types';
import { ELEMENTS } from '../chem/elements';

interface BuildState {
  atoms: Atom[];
  bonds: Bond[];
  selectedAtomId: string | null;
  targetId: string;
  showPolarity: boolean;
  showAngles: boolean;
  dragging: boolean;
  notice: string;
  atomSerial: number;
  bondSerial: number;
  addAtom: (element: ElementSymbol) => void;
  removeAtom: (id: string) => void;
  removeBond: (id: string) => void;
  clear: () => void;
  selectAtom: (id: string | null) => void;
  moveAtom: (id: string, position: Vec3) => void;
  snapDraggedAtom: (id: string) => void;
  bondSelectedTo: (hostId: string) => void;
  autoBondSelected: () => void;
  loadMolecule: (id: string, mode: 'complete' | 'target') => void;
  togglePolarity: () => void;
  toggleAngles: () => void;
  setDragging: (dragging: boolean) => void;
  setNotice: (notice: string) => void;
}

const initialMolecule = getMolecule('h2o');
const initialAtoms: Atom[] = initialMolecule.atoms.map((atom, index) => ({
  id: `a${index + 1}`,
  element: atom.element,
  position: [...atom.position] as Vec3,
  targetIndex: index,
}));
const initialBonds: Bond[] = initialMolecule.bonds.map((bond, index) => ({
  id: `b${index + 1}`,
  a: `a${bond.a + 1}`,
  b: `a${bond.b + 1}`,
  order: bond.order,
  ionic: bond.ionic,
}));

export const useBuildStore = create<BuildState>((set, get) => ({
  atoms: initialAtoms,
  bonds: initialBonds,
  selectedAtomId: 'a1',
  targetId: 'h2o',
  showPolarity: true,
  showAngles: true,
  dragging: false,
  notice: '물 분자 표본입니다. 원자를 끌어 직접 조립하거나 도감을 둘러보세요.',
  atomSerial: initialAtoms.length + 1,
  bondSerial: initialBonds.length + 1,

  addAtom: (element) => {
    const state = get();
    const position = nextFreePosition(state.atoms, state.atomSerial);
    const atom: Atom = {
      id: `a${state.atomSerial}`,
      element,
      position,
    };
    set({
      atoms: [...state.atoms, atom],
      selectedAtomId: atom.id,
      atomSerial: state.atomSerial + 1,
      notice: `${ELEMENTS[element].nameKo} 원자를 실험대에 놓았습니다. 다른 원자 가까이로 끌어 보세요.`,
    });
  },

  removeAtom: (id) => {
    const state = get();
    const atom = state.atoms.find((candidate) => candidate.id === id);
    if (!atom) return;
    set({
      atoms: state.atoms.filter((candidate) => candidate.id !== id),
      bonds: state.bonds.filter((bond) => bond.a !== id && bond.b !== id),
      selectedAtomId: state.selectedAtomId === id ? null : state.selectedAtomId,
      notice: `${ELEMENTS[atom.element].nameKo} 원자를 치웠습니다.`,
    });
  },

  removeBond: (id) => {
    const state = get();
    const bond = state.bonds.find((candidate) => candidate.id === id);
    if (!bond) return;
    set({
      bonds: state.bonds.filter((candidate) => candidate.id !== id),
      notice: '결합을 끊었습니다. 두 원자는 실험대에 그대로 남아 있습니다.',
    });
  },

  clear: () => {
    set({
      atoms: [],
      bonds: [],
      selectedAtomId: null,
      atomSerial: 1,
      bondSerial: 1,
      notice: '실험대를 비웠습니다. 팔레트에서 원자를 골라 새로 시작하세요.',
    });
  },

  selectAtom: (id) => set({ selectedAtomId: id }),

  moveAtom: (id, position) => {
    const state = get();
    const safePosition = position.map((value) =>
      Number.isFinite(value) ? Math.max(-9, Math.min(9, value)) : 0,
    ) as Vec3;
    set({
      atoms: state.atoms.map((atom) =>
        atom.id === id ? { ...atom, position: safePosition } : atom,
      ),
      selectedAtomId: id,
      dragging: true,
    });
  },

  snapDraggedAtom: (id) => {
    const state = get();
    const atom = state.atoms.find((candidate) => candidate.id === id);
    if (!atom) return;
    const snap = findSnapHost(atom, state.atoms, state.bonds);
    if (!snap) {
      set({
        dragging: false,
        selectedAtomId: id,
        notice: '결합할 자리를 찾지 못했습니다. 다른 원자 가까이에 다시 놓아 보세요.',
      });
      return;
    }
    const targetGeometry = targetRelativePosition(state.targetId, atom, snap.host);
    const bondId = `b${state.bondSerial}`;
    const newBond: Bond = {
      id: bondId,
      a: id,
      b: snap.host.id,
      order: targetGeometry?.order ?? 1,
      ionic: targetGeometry?.ionic,
    };
    set({
      atoms: state.atoms.map((candidate) =>
        candidate.id === id
          ? { ...candidate, position: targetGeometry?.position ?? snap.position }
          : candidate,
      ),
      bonds: [...state.bonds, newBond],
      bondSerial: state.bondSerial + 1,
      selectedAtomId: snap.host.id,
      dragging: false,
      notice: `${ELEMENTS[snap.host.element].nameKo}–${ELEMENTS[atom.element].nameKo} 결합이 만들어졌습니다.`,
    });
  },

  bondSelectedTo: (otherId) => {
    const state = get();
    const selected = state.atoms.find((atom) => atom.id === state.selectedAtomId);
    const other = state.atoms.find((atom) => atom.id === otherId);
    if (!selected || !other || selected.id === other.id) {
      set({ notice: '결합할 원자를 먼저 선택하세요.' });
      return;
    }
    const target = getMolecule(state.targetId);
    if (
      selected.targetIndex !== undefined &&
      other.targetIndex !== undefined &&
      !target.bonds.some(
        (bond) =>
          (bond.a === selected.targetIndex && bond.b === other.targetIndex) ||
          (bond.b === selected.targetIndex && bond.a === other.targetIndex),
      )
    ) {
      set({ notice: '목표 구조에서는 이 두 원자가 직접 결합하지 않습니다.' });
      return;
    }
    const direction = connectionDirection(selected, other, state.bonds);
    if (!direction) {
      if (state.bonds.some((bond) => isSameBond(bond, selected.id, other.id))) {
        set({ notice: '이미 결합된 두 원자입니다.' });
      } else {
        set({ notice: '두 원자 모두 결합할 자리가 없습니다. 새 원자를 놓아 보세요.' });
      }
      return;
    }
    const selectedBonds = state.bonds.filter(
      (bond) => bond.a === selected.id || bond.b === selected.id,
    );
    const otherBonds = state.bonds.filter((bond) => bond.a === other.id || bond.b === other.id);
    let moving: Atom;
    let anchor: Atom;
    let port: Vec3 | null;
    if (direction === 'selected-to-other') {
      moving = selected;
      anchor = other;
      port = bestPortFor(other, selected.position, otherBonds, state.atoms);
    } else {
      moving = other;
      anchor = selected;
      port = bestPortFor(selected, other.position, selectedBonds, state.atoms);
    }
    if (!port) {
      set({ notice: `${ELEMENTS[anchor.element].nameKo} 원자는 결합할 자리가 가득 찼습니다.` });
      return;
    }
    const targetGeometry = targetRelativePosition(state.targetId, moving, anchor);
    const position =
      targetGeometry?.position ?? add(anchor.position, scale(port, SINGLE_BOND_LENGTH));
    const nextAtoms = state.atoms.map((atom) =>
      atom.id === moving.id ? { ...atom, position } : atom,
    );
    const nextBonds: Bond[] = [
      ...state.bonds,
      {
        id: `b${state.bondSerial}`,
        a: selected.id,
        b: other.id,
        order: targetGeometry?.order ?? 1,
        ionic: targetGeometry?.ionic,
      },
    ];
    const nextSelected = nextGuidedSelection(
      state.selectedAtomId,
      nextAtoms,
      nextBonds,
      state.targetId,
    );
    set({
      atoms: nextAtoms,
      bonds: nextBonds,
      bondSerial: state.bondSerial + 1,
      selectedAtomId: nextSelected,
      notice: `${ELEMENTS[selected.element].nameKo}–${ELEMENTS[other.element].nameKo} 결합이 만들어졌습니다.`,
    });
  },

  autoBondSelected: () => {
    const state = get();
    const selected = state.atoms.find((atom) => atom.id === state.selectedAtomId);
    if (!selected) {
      set({ notice: '먼저 결합할 원자를 선택하세요.' });
      return;
    }
    const target = getMolecule(state.targetId);
    const isTargetPair = (atom: Atom) =>
      selected.targetIndex !== undefined &&
      atom.targetIndex !== undefined &&
      target.bonds.some(
        (bond) =>
          (bond.a === selected.targetIndex && bond.b === atom.targetIndex) ||
          (bond.b === selected.targetIndex && bond.a === atom.targetIndex),
      );
    const candidates = state.atoms
      .filter((atom) => atom.id !== selected.id)
      .filter((atom) => connectionDirection(selected, atom, state.bonds) !== null)
      .filter((atom) => {
        if (selected.targetIndex === undefined || atom.targetIndex === undefined) {
          return true;
        }
        return target.bonds.some(
          (bond) =>
            (bond.a === selected.targetIndex && bond.b === atom.targetIndex) ||
            (bond.b === selected.targetIndex && bond.a === atom.targetIndex),
        );
      })
      .sort(
        (first, second) =>
          Number(isTargetPair(second)) - Number(isTargetPair(first)) ||
          distanceSquared(selected.position, first.position) -
            distanceSquared(selected.position, second.position),
      );
    const other = candidates[0];
    if (!other) {
      set({ notice: '지금 결합할 수 있는 원자가 없습니다. 새 원자를 놓아 보세요.' });
      return;
    }
    get().bondSelectedTo(other.id);
  },

  loadMolecule: (id, mode) => {
    const molecule = getMolecule(id);
    if (mode === 'complete') {
      const atoms = molecule.atoms.map((atom, index) => ({
        id: `a${index + 1}`,
        element: atom.element,
        position: [...atom.position] as Vec3,
        targetIndex: index,
      }));
      const bonds = molecule.bonds.map((bond, index) => ({
        id: `b${index + 1}`,
        a: `a${bond.a + 1}`,
        b: `a${bond.b + 1}`,
        order: bond.order,
        ionic: bond.ionic,
      }));
      const center = centralAtomIndex(molecule);
      set({
        atoms,
        bonds,
        selectedAtomId: `a${center + 1}`,
        targetId: id,
        atomSerial: atoms.length + 1,
        bondSerial: bonds.length + 1,
        notice: `${molecule.nameKo} 완성본을 실험대에 놓았습니다.`,
      });
      return;
    }
    const center = centralAtomIndex(molecule);
    const atoms = molecule.atoms.map((atom, index) =>
      index === center
        ? {
            id: `a${index + 1}`,
            element: atom.element,
            position: [0, 0, 0] as Vec3,
            targetIndex: index,
          }
        : {
            id: `a${index + 1}`,
            element: atom.element,
            position: ringPosition(index, molecule.atoms.length - 1, 2.95),
            targetIndex: index,
          },
    );
    set({
      atoms,
      bonds: [],
      selectedAtomId: `a${center + 1}`,
      targetId: id,
      atomSerial: atoms.length + 1,
      bondSerial: 1,
      notice: `${molecule.nameKo} 목표가 준비되었습니다. 원자를 끌어 ${displayFormula(molecule.formula)} 분자를 완성해 보세요.`,
    });
  },

  togglePolarity: () =>
    set((state) => ({
      showPolarity: !state.showPolarity,
      notice: state.showPolarity ? '극성 표시를 껐습니다.' : '결합 극성과 합성 벡터를 표시합니다.',
    })),

  toggleAngles: () =>
    set((state) => ({
      showAngles: !state.showAngles,
      notice: state.showAngles ? '결합각 표시를 껐습니다.' : '선택한 원자의 결합각을 표시합니다.',
    })),

  setDragging: (dragging) => set({ dragging }),

  setNotice: (notice) => set({ notice }),
}));

function distanceSquared(first: Vec3, second: Vec3): number {
  return (first[0] - second[0]) ** 2 + (first[1] - second[1]) ** 2 + (first[2] - second[2]) ** 2;
}

function nextFreePosition(atoms: Atom[], serial: number): Vec3 {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const angle = (serial + attempt) * 2.399963;
    const radius = 2.05 + (attempt % 3) * 0.55;
    const candidate: Vec3 = [
      Math.cos(angle) * radius,
      0.25 + ((serial + attempt) % 3) * 0.45,
      Math.sin(angle) * radius * 0.7,
    ];
    const tooClose = atoms.some((atom) => distanceSquared(atom.position, candidate) < 1.2);
    if (!tooClose) return candidate;
  }
  return [2.4, 0.8, 0];
}

function nextGuidedSelection(
  selectedId: string | null,
  atoms: Atom[],
  bonds: Bond[],
  targetId: string,
): string | null {
  const target = getMolecule(targetId);
  const missingFor = (atom: Atom) => {
    if (atom.targetIndex === undefined) return 0;
    const atomBonds = bonds.filter((bond) => bond.a === atom.id || bond.b === atom.id);
    const freePorts = portsFor(atom.element).length - atomBonds.length;
    if (freePorts <= 0) return 0;
    let missing = 0;
    for (const bond of target.bonds) {
      if (bond.a !== atom.targetIndex && bond.b !== atom.targetIndex) continue;
      const partnerIndex = bond.a === atom.targetIndex ? bond.b : bond.a;
      const partner = atoms.find((candidate) => candidate.targetIndex === partnerIndex);
      if (!partner) continue;
      if (!atomBonds.some((atomBond) => isSameBond(atomBond, atom.id, partner.id))) {
        missing += 1;
      }
    }
    return missing;
  };
  const current = atoms.find((atom) => atom.id === selectedId);
  if (current && missingFor(current) > 0) return current.id;
  const next = atoms.find((atom) => missingFor(atom) > 0);
  return next?.id ?? selectedId;
}

function targetRelativePosition(
  targetId: string,
  moving: Atom,
  anchor: Atom,
): { position: Vec3; order: 1 | 2 | 3; ionic?: boolean } | null {
  if (moving.targetIndex === undefined || anchor.targetIndex === undefined) return null;
  const molecule = getMolecule(targetId);
  const bond = molecule.bonds.find(
    (candidate) =>
      (candidate.a === moving.targetIndex && candidate.b === anchor.targetIndex) ||
      (candidate.b === moving.targetIndex && candidate.a === anchor.targetIndex),
  );
  if (!bond) return null;
  const targetMoving = molecule.atoms[moving.targetIndex]?.position;
  const targetAnchor = molecule.atoms[anchor.targetIndex]?.position;
  if (!targetMoving || !targetAnchor) return null;
  return {
    position: [
      anchor.position[0] + targetMoving[0] - targetAnchor[0],
      anchor.position[1] + targetMoving[1] - targetAnchor[1],
      anchor.position[2] + targetMoving[2] - targetAnchor[2],
    ],
    order: bond.order,
    ionic: bond.ionic,
  };
}
