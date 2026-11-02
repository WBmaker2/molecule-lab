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
import { canSetBondOrder, displayFormula } from '../chem/analysis';
import { centralAtomIndex, getMolecule } from '../chem/molecules';
import { targetRelativePosition } from '../chem/targetGeometry';
import type { WorkbenchPayload } from '../lib/share';
import { parseWorkbench, serializeWorkbench } from '../lib/share';
import type { Atom, Bond, ElementSymbol, Vec3 } from '../chem/types';
import { ELEMENTS } from '../chem/elements';

interface BuildSnapshot {
  atoms: Atom[];
  bonds: Bond[];
  selectedAtomId: string | null;
  measureTargetId: string | null;
  targetId: string;
  atomSerial: number;
  bondSerial: number;
}

interface BuildState {
  atoms: Atom[];
  bonds: Bond[];
  selectedAtomId: string | null;
  measureTargetId: string | null;
  targetId: string;
  past: BuildSnapshot[];
  future: BuildSnapshot[];
  dragMode: 'move' | 'rotate';
  showPolarity: boolean;
  showAngles: boolean;
  showLonePairs: boolean;
  dragging: boolean;
  notice: string;
  atomSerial: number;
  bondSerial: number;
  addAtom: (element: ElementSymbol) => void;
  removeAtom: (id: string) => void;
  removeBond: (id: string) => void;
  cycleBondOrder: (id: string) => void;
  clear: () => void;
  selectAtom: (id: string | null) => void;
  setMeasureTarget: (id: string | null) => void;
  moveAtom: (id: string, position: Vec3) => void;
  snapDraggedAtom: (id: string) => void;
  snapDraggedToHost: (draggedId: string, hostId: string) => void;
  bondSelectedTo: (hostId: string) => void;
  autoBondSelected: () => void;
  loadMolecule: (id: string, mode: 'complete' | 'target') => void;
  exportWorkbench: () => WorkbenchPayload;
  importWorkbench: (payload: unknown) => void;
  setDragMode: (mode: 'move' | 'rotate') => void;
  undo: () => void;
  redo: () => void;
  duplicateSelected: () => void;
  togglePolarity: () => void;
  toggleAngles: () => void;
  toggleLonePairs: () => void;
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

function snapshotOf(state: BuildState): BuildSnapshot {
  return {
    atoms: state.atoms.map((atom) => ({ ...atom, position: [...atom.position] as Vec3 })),
    bonds: state.bonds.map((bond) => ({ ...bond })),
    selectedAtomId: state.selectedAtomId,
    measureTargetId: state.measureTargetId,
    targetId: state.targetId,
    atomSerial: state.atomSerial,
    bondSerial: state.bondSerial,
  };
}

function pushHistory(
  get: () => BuildState,
  set: (partial: Partial<BuildState>) => void,
): void {
  const state = get();
  set({
    past: [...state.past, snapshotOf(state)].slice(-50),
    future: [],
  });
}

export const useBuildStore = create<BuildState>((set, get) => ({
  atoms: initialAtoms,
  bonds: initialBonds,
  selectedAtomId: 'a1',
  measureTargetId: null,
  targetId: 'h2o',
  past: [],
  future: [],
  dragMode: 'move',
  showPolarity: true,
  showAngles: true,
  showLonePairs: true,
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
    pushHistory(get, set);
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
    pushHistory(get, set);
    set({
      atoms: state.atoms.filter((candidate) => candidate.id !== id),
      bonds: state.bonds.filter((bond) => bond.a !== id && bond.b !== id),
      selectedAtomId: state.selectedAtomId === id ? null : state.selectedAtomId,
      measureTargetId: state.measureTargetId === id ? null : state.measureTargetId,
      notice: `${ELEMENTS[atom.element].nameKo} 원자를 치웠습니다.`,
    });
  },

  removeBond: (id) => {
    const state = get();
    const bond = state.bonds.find((candidate) => candidate.id === id);
    if (!bond) return;
    pushHistory(get, set);
    set({
      bonds: state.bonds.filter((candidate) => candidate.id !== id),
      notice: '결합을 끊었습니다. 두 원자는 실험대에 그대로 남아 있습니다.',
    });
  },

  cycleBondOrder: (id) => {
    const state = get();
    const bond = state.bonds.find((candidate) => candidate.id === id);
    if (!bond) return;
    const nextOrder = bond.order === 1 ? 2 : bond.order === 2 ? 3 : 1;
    const validation = canSetBondOrder(state.atoms, state.bonds, id, nextOrder);
    if (!validation.ok) {
      set({ notice: validation.reasonKo ?? '결합 차수를 바꿀 수 없습니다.' });
      return;
    }
    pushHistory(get, set);
    set({
      bonds: state.bonds.map((candidate) =>
        candidate.id === id ? { ...candidate, order: nextOrder } : candidate,
      ),
      notice: `결합 차수를 ${nextOrder}중 결합으로 바꾸었습니다.`,
    });
  },

  clear: () => {
    pushHistory(get, set);
    set({
      atoms: [],
      bonds: [],
      selectedAtomId: null,
      measureTargetId: null,
      atomSerial: 1,
      bondSerial: 1,
      notice: '실험대를 비웠습니다. 팔레트에서 원자를 골라 새로 시작하세요.',
    });
  },

  selectAtom: (id) => set({ selectedAtomId: id }),

  setMeasureTarget: (id) => set({ measureTargetId: id }),

  moveAtom: (id, position) => {
    const state = get();
    const safePosition = position.map((value) =>
      Number.isFinite(value) ? Math.max(-9, Math.min(9, value)) : 0,
    ) as Vec3;
    if (!state.dragging) pushHistory(get, set);
    set({
      atoms: state.atoms.map((atom) =>
        atom.id === id ? { ...atom, position: safePosition } : atom,
      ),
      selectedAtomId: id,
      dragging: true,
    });
  },

  snapDraggedToHost: (draggedId, hostId) => {
    const state = get();
    const dragged = state.atoms.find((candidate) => candidate.id === draggedId);
    const host = state.atoms.find((candidate) => candidate.id === hostId);
    if (!dragged || !host || dragged.id === host.id) return;
    if (state.bonds.some((bond) => isSameBond(bond, dragged.id, host.id))) {
      set({
        dragging: false,
        selectedAtomId: dragged.id,
        notice: '이미 결합된 두 원자입니다.',
      });
      return;
    }
    const hostBonds = state.bonds.filter((bond) => bond.a === host.id || bond.b === host.id);
    const hostPorts = portsFor(host.element);
    if (
      hostBonds.length >= hostPorts.length ||
      hostPorts.length < portsFor(dragged.element).length
    ) {
      set({
        dragging: false,
        selectedAtomId: dragged.id,
        notice: `${ELEMENTS[host.element].nameKo} 원자는 결합할 자리가 가득 찼습니다.`,
      });
      return;
    }
    const port = bestPortFor(host, dragged.position, hostBonds, state.atoms);
    if (!port) {
      set({
        dragging: false,
        selectedAtomId: dragged.id,
        notice: `${ELEMENTS[host.element].nameKo} 원자는 결합할 자리가 가득 찼습니다.`,
      });
      return;
    }
    const targetGeometry = targetRelativePosition(state.targetId, dragged, host);
    set({
      atoms: state.atoms.map((candidate) =>
        candidate.id === dragged.id
          ? {
              ...candidate,
              position: targetGeometry?.position ?? add(host.position, scale(port, SINGLE_BOND_LENGTH)),
            }
          : candidate,
      ),
      bonds: [
        ...state.bonds,
        {
          id: `b${state.bondSerial}`,
          a: dragged.id,
          b: host.id,
          order: targetGeometry?.order ?? 1,
          ionic: targetGeometry?.ionic,
        },
      ],
      bondSerial: state.bondSerial + 1,
      selectedAtomId: host.id,
      dragging: false,
      notice: `${ELEMENTS[host.element].nameKo}–${ELEMENTS[dragged.element].nameKo} 결합이 만들어졌습니다.`,
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
    pushHistory(get, set);
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
      pushHistory(get, set);
      set({
        atoms,
        bonds,
        selectedAtomId: `a${center + 1}`,
        measureTargetId: null,
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
    pushHistory(get, set);
    set({
      atoms,
      bonds: [],
      selectedAtomId: `a${center + 1}`,
      measureTargetId: null,
      targetId: id,
      atomSerial: atoms.length + 1,
      bondSerial: 1,
      notice: `${molecule.nameKo} 목표가 준비되었습니다. 원자를 끌어 ${displayFormula(molecule.formula)} 분자를 완성해 보세요.`,
    });
  },

  setDragMode: (mode) => set({ dragMode: mode }),

  undo: () => {
    const state = get();
    const previous = state.past[state.past.length - 1];
    if (!previous) {
      set({ notice: '되돌릴 작업이 없습니다.' });
      return;
    }
    set({
      atoms: previous.atoms,
      bonds: previous.bonds,
      selectedAtomId: previous.selectedAtomId,
      measureTargetId: previous.measureTargetId,
      targetId: previous.targetId,
      atomSerial: previous.atomSerial,
      bondSerial: previous.bondSerial,
      past: state.past.slice(0, -1),
      future: [snapshotOf(state), ...state.future].slice(-50),
      dragging: false,
      notice: '실행을 취소했습니다.',
    });
  },

  redo: () => {
    const state = get();
    const next = state.future[state.future.length - 1];
    if (!next) {
      set({ notice: '다시 실행할 작업이 없습니다.' });
      return;
    }
    set({
      atoms: next.atoms,
      bonds: next.bonds,
      selectedAtomId: next.selectedAtomId,
      measureTargetId: next.measureTargetId,
      targetId: next.targetId,
      atomSerial: next.atomSerial,
      bondSerial: next.bondSerial,
      past: [...state.past, snapshotOf(state)].slice(-50),
      future: state.future.slice(0, -1),
      dragging: false,
      notice: '실행을 다시 적용했습니다.',
    });
  },

  duplicateSelected: () => {
    const state = get();
    const selected = state.atoms.find((atom) => atom.id === state.selectedAtomId);
    if (!selected) {
      set({ notice: '먼저 복제할 원자를 선택하세요.' });
      return;
    }
    const position: Vec3 = [
      Math.max(-9, Math.min(9, selected.position[0] + 0.8)),
      Math.max(-9, Math.min(9, selected.position[1] + 0.8)),
      Math.max(-9, Math.min(9, selected.position[2])),
    ];
    pushHistory(get, set);
    set({
      atoms: [...state.atoms, { ...selected, id: `a${state.atomSerial}`, position }],
      selectedAtomId: `a${state.atomSerial}`,
      atomSerial: state.atomSerial + 1,
      notice: `${ELEMENTS[selected.element].nameKo} 원자를 복제했습니다.`,
    });
  },

  exportWorkbench: () => {
    const state = get();
    return serializeWorkbench({
      targetId: state.targetId,
      atoms: state.atoms,
      bonds: state.bonds,
      selectedAtomId: state.selectedAtomId,
      atomSerial: state.atomSerial,
      bondSerial: state.bondSerial,
    });
  },

  importWorkbench: (payload: unknown) => {
    let snapshot;
    try {
      snapshot = parseWorkbench(payload);
    } catch (error) {
      set({ notice: error instanceof Error ? error.message : '작업대를 불러오지 못했습니다.' });
      return;
    }
    pushHistory(get, set);
    set({
      targetId: snapshot.targetId,
      atoms: snapshot.atoms,
      bonds: snapshot.bonds,
      selectedAtomId: snapshot.selectedAtomId,
      measureTargetId: null,
      atomSerial: snapshot.atomSerial,
      bondSerial: snapshot.bondSerial,
      notice: '저장된 작업대를 불러왔습니다.',
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

  toggleLonePairs: () =>
    set((state) => ({
      showLonePairs: !state.showLonePairs,
      notice: state.showLonePairs
        ? '비공유 전자쌍 표시를 껐습니다.'
        : '비공유 전자쌍을 반투명 표시로 보여줍니다.',
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
