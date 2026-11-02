import { CONTENT_VERSION } from '../chem/content';
import { MOLECULE_BY_ID } from '../chem/molecules';
import type { Atom, Bond, ElementSymbol } from '../chem/types';
import { ELEMENTS } from '../chem/elements';

export const WORKBENCH_VERSION = '1' as const;
const STORAGE_KEY = 'molecule-lab:build:v1';

export interface WorkbenchSnapshot {
  targetId: string;
  atoms: Atom[];
  bonds: Bond[];
  selectedAtomId: string | null;
  atomSerial: number;
  bondSerial: number;
}

export interface WorkbenchPayload extends WorkbenchSnapshot {
  version: typeof WORKBENCH_VERSION;
  contentVersion: typeof CONTENT_VERSION;
}

interface WorkbenchState {
  targetId: string;
  atoms: Atom[];
  bonds: Bond[];
  selectedAtomId: string | null;
  atomSerial: number;
  bondSerial: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isVec3(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((component) => typeof component === 'number' && Number.isFinite(component))
  );
}

function isElementSymbol(value: unknown): value is ElementSymbol {
  return typeof value === 'string' && value in ELEMENTS;
}

export function serializeWorkbench(state: WorkbenchState): WorkbenchPayload {
  return {
    version: WORKBENCH_VERSION,
    contentVersion: CONTENT_VERSION,
    targetId: state.targetId,
    atoms: state.atoms.map((atom) => ({
      id: atom.id,
      element: atom.element,
      position: [...atom.position] as [number, number, number],
      ...(atom.targetIndex === undefined ? {} : { targetIndex: atom.targetIndex }),
    })),
    bonds: state.bonds.map((bond) => ({
      id: bond.id,
      a: bond.a,
      b: bond.b,
      order: bond.order,
      ...(bond.ionic === undefined ? {} : { ionic: bond.ionic }),
    })),
    selectedAtomId: state.selectedAtomId,
    atomSerial: state.atomSerial,
    bondSerial: state.bondSerial,
  };
}

export function parseWorkbench(payload: unknown): WorkbenchSnapshot {
  if (!isRecord(payload)) throw new Error('작업대 데이터가 올바르지 않습니다.');
  if (payload.version !== WORKBENCH_VERSION) throw new Error('지원하지 않는 작업대 버전입니다.');
  if (payload.contentVersion !== CONTENT_VERSION) {
    throw new Error('작업대 콘텐츠 버전이 다릅니다. 최신 화면에서 다시 저장하세요.');
  }
  if (typeof payload.targetId !== 'string' || !(payload.targetId in MOLECULE_BY_ID)) {
    throw new Error('알 수 없는 목표 분자입니다.');
  }
  if (!Array.isArray(payload.atoms) || !Array.isArray(payload.bonds)) {
    throw new Error('원자 또는 결합 목록이 올바르지 않습니다.');
  }
  const atomIds = new Set<string>();
  const atoms: Atom[] = payload.atoms.map((entry) => {
    if (!isRecord(entry) || typeof entry.id !== 'string' || !isElementSymbol(entry.element)) {
      throw new Error('원자 데이터가 올바르지 않습니다.');
    }
    if (!isVec3(entry.position)) throw new Error('원자 위치가 올바르지 않습니다.');
    if (atomIds.has(entry.id)) throw new Error('원자 id가 중복되었습니다.');
    atomIds.add(entry.id);
    const targetIndex: unknown = entry.targetIndex;
    if (targetIndex !== undefined && (typeof targetIndex !== 'number' || !Number.isInteger(targetIndex) || targetIndex < 0)) {
      throw new Error('목표 원자 번호가 올바르지 않습니다.');
    }
    const atom: Atom = {
      id: entry.id,
      element: entry.element,
      position: entry.position,
    };
    if (typeof targetIndex === 'number') atom.targetIndex = targetIndex;
    return atom;
  });
  const bondIds = new Set<string>();
  const bonds: Bond[] = payload.bonds.map((entry) => {
    if (!isRecord(entry) || typeof entry.id !== 'string') {
      throw new Error('결합 데이터가 올바르지 않습니다.');
    }
    if (typeof entry.a !== 'string' || typeof entry.b !== 'string') {
      throw new Error('결합 끝점이 올바르지 않습니다.');
    }
    if (!atomIds.has(entry.a) || !atomIds.has(entry.b) || entry.a === entry.b) {
      throw new Error('결합이 존재하지 않는 원자를 가리킵니다.');
    }
    if (entry.order !== 1 && entry.order !== 2 && entry.order !== 3) {
      throw new Error('결합 차수가 올바르지 않습니다.');
    }
    if (bondIds.has(entry.id)) throw new Error('결합 id가 중복되었습니다.');
    bondIds.add(entry.id);
    return {
      id: entry.id,
      a: entry.a,
      b: entry.b,
      order: entry.order,
      ...(entry.ionic === undefined ? {} : { ionic: Boolean(entry.ionic) }),
    };
  });
  const selectedAtomId: unknown = payload.selectedAtomId;
  if (selectedAtomId !== null && (typeof selectedAtomId !== 'string' || !atomIds.has(selectedAtomId))) {
    throw new Error('선택한 원자가 올바르지 않습니다.');
  }
  const atomSerial: unknown = payload.atomSerial;
  const bondSerial: unknown = payload.bondSerial;
  if (typeof atomSerial !== 'number' || !Number.isInteger(atomSerial) || atomSerial < 1) {
    throw new Error('원자 번호가 올바르지 않습니다.');
  }
  if (typeof bondSerial !== 'number' || !Number.isInteger(bondSerial) || bondSerial < 1) {
    throw new Error('결합 번호가 올바르지 않습니다.');
  }
  return {
    targetId: payload.targetId,
    atoms,
    bonds,
    selectedAtomId,
    atomSerial,
    bondSerial,
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function encodeWorkbenchToHash(payload: WorkbenchPayload): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

export function decodeWorkbenchFromHash(hash: string): WorkbenchSnapshot {
  const json = new TextDecoder().decode(base64UrlToBytes(hash));
  return parseWorkbench(JSON.parse(json) as unknown);
}

export function saveWorkbench(payload: WorkbenchPayload): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

export function loadSavedWorkbench(): unknown | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function clearSavedWorkbench(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}
