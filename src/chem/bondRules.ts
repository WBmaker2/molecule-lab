import type { Atom, Bond, ElementSymbol, Vec3 } from './types';

export const SINGLE_BOND_LENGTH = 1.5;
export const SNAP_RADIUS = 2.45;

const HALF_WATER = (104.5 / 2) * (Math.PI / 180);
const HALF_H2S = (92 / 2) * (Math.PI / 180);

const PORTS: Record<ElementSymbol, Vec3[]> = {
  H: [[0, 1, 0]],
  Cl: [[0, 1, 0]],
  Na: [[0, 1, 0]],
  Ag: [[0, 1, 0]],
  O: [
    [Math.sin(HALF_WATER), Math.cos(HALF_WATER), 0],
    [-Math.sin(HALF_WATER), Math.cos(HALF_WATER), 0],
  ],
  S: [
    [Math.sin(HALF_H2S), Math.cos(HALF_H2S), 0],
    [-Math.sin(HALF_H2S), Math.cos(HALF_H2S), 0],
  ],
  N: [
    [0.92821, 0.37205, 0],
    [-0.4641, 0.37205, 0.80386],
    [-0.4641, 0.37205, -0.80386],
  ],
  C: [
    [0.57735, 0.57735, 0.57735],
    [0.57735, -0.57735, -0.57735],
    [-0.57735, 0.57735, -0.57735],
    [-0.57735, -0.57735, 0.57735],
  ],
};

export function portsFor(element: ElementSymbol): readonly Vec3[] {
  return PORTS[element];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function lonePairDirections(neighborDirections: Vec3[], count: number): Vec3[] {
  if (count <= 0) return [];
  const total: Vec3 = [0, 0, 0];
  for (const direction of neighborDirections) {
    const unit = normalize(direction);
    total[0] += unit[0];
    total[1] += unit[1];
    total[2] += unit[2];
  }
  let axis = normalize([-total[0], -total[1], -total[2]]);
  if (lengthOf(axis) === 0) axis = [0, -1, 0];
  if (count === 1) return [axis];
  const helper: Vec3 = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const first = normalize(cross(axis, helper));
  const second = normalize(cross(axis, first));
  if (count === 2) {
    const spread = (35 * Math.PI) / 180;
    return [
      normalize([
        axis[0] * Math.cos(spread) + first[0] * Math.sin(spread),
        axis[1] * Math.cos(spread) + first[1] * Math.sin(spread),
        axis[2] * Math.cos(spread) + first[2] * Math.sin(spread),
      ]),
      normalize([
        axis[0] * Math.cos(spread) - first[0] * Math.sin(spread),
        axis[1] * Math.cos(spread) - first[1] * Math.sin(spread),
        axis[2] * Math.cos(spread) - first[2] * Math.sin(spread),
      ]),
    ];
  }
  const cone = (50 * Math.PI) / 180;
  return [0, 1, 2].slice(0, Math.min(count, 3)).map((slot) => {
    const azimuth = (slot / 3) * Math.PI * 2;
    const radial: Vec3 = [
      first[0] * Math.cos(azimuth) + second[0] * Math.sin(azimuth),
      first[1] * Math.cos(azimuth) + second[1] * Math.sin(azimuth),
      first[2] * Math.cos(azimuth) + second[2] * Math.sin(azimuth),
    ];
    return normalize([
      axis[0] * Math.cos(cone) + radial[0] * Math.sin(cone),
      axis[1] * Math.cos(cone) + radial[1] * Math.sin(cone),
      axis[2] * Math.cos(cone) + radial[2] * Math.sin(cone),
    ]);
  });
}

export function lengthOf(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function normalize(a: Vec3): Vec3 {
  const len = lengthOf(a);
  return len > 0 ? scale(a, 1 / len) : [0, 0, 0];
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function degreesBetween(a: Vec3, b: Vec3): number {
  const denominator = lengthOf(a) * lengthOf(b);
  if (denominator === 0) return 0;
  const cosine = Math.max(-1, Math.min(1, dot(a, b) / denominator));
  return (Math.acos(cosine) * 180) / Math.PI;
}

export interface SnapResult {
  host: Atom;
  port: Vec3;
  position: Vec3;
  distance: number;
}

export function findSnapHost(dragged: Atom, atoms: Atom[], bonds: Bond[]): SnapResult | null {
  let best: SnapResult | null = null;
  for (const host of atoms) {
    if (host.id === dragged.id) continue;
    if (bonds.some((bond) => isSameBond(bond, dragged.id, host.id))) continue;
    const hostBonds = bonds.filter((bond) => bond.a === host.id || bond.b === host.id);
    const ports = portsFor(host.element);
    if (hostBonds.length >= ports.length) continue;
    if (ports.length < portsFor(dragged.element).length) continue;
    const used = usedPortIndices(host, hostBonds, atoms);
    const free = ports.filter((_, index) => !used.has(index));
    if (free.length === 0) continue;
    const away = sub(dragged.position, host.position);
    const awayLength = lengthOf(away);
    if (awayLength > SNAP_RADIUS) continue;
    const direction = normalize(away);
    let chosen = free[0];
    let bestScore = -2;
    for (const port of free) {
      const score = dot(port, direction);
      if (score > bestScore) {
        bestScore = score;
        chosen = port;
      }
    }
    const position = add(host.position, scale(chosen, SINGLE_BOND_LENGTH));
    const candidate: SnapResult = { host, port: chosen, position, distance: awayLength };
    if (!best || candidate.distance < best.distance) best = candidate;
  }
  return best;
}

export function usedPortIndices(atom: Atom, atomBonds: Bond[], atoms: Atom[]): Set<number> {
  const used = new Set<number>();
  if (atomBonds.length === 0) return used;
  const byId = new Map(atoms.map((candidate) => [candidate.id, candidate]));
  const ports = portsFor(atom.element);
  for (const bond of atomBonds) {
    const otherId = bond.a === atom.id ? bond.b : bond.a;
    const other = byId.get(otherId);
    if (!other) continue;
    const direction = normalize(sub(other.position, atom.position));
    let bestIndex = -1;
    let bestScore = -2;
    for (let index = 0; index < ports.length; index += 1) {
      if (used.has(index)) continue;
      const score = dot(ports[index], direction);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    if (bestIndex >= 0) used.add(bestIndex);
  }
  return used;
}

export function freePortIndices(atom: Atom, atomBonds: Bond[], atoms: Atom[]): number[] {
  const ports = portsFor(atom.element);
  const used = usedPortIndices(atom, atomBonds, atoms);
  return ports.map((_, index) => index).filter((index) => !used.has(index));
}

export function bestPortFor(
  host: Atom,
  target: Vec3,
  atomBonds: Bond[],
  atoms: Atom[],
): Vec3 | null {
  const ports = portsFor(host.element);
  if (atomBonds.length >= ports.length) return null;
  const free = freePortIndices(host, atomBonds, atoms);
  if (free.length === 0) return null;
  const direction = normalize(sub(target, host.position));
  let best = ports[free[0]];
  let bestScore = -2;
  for (const index of free) {
    const score = dot(ports[index], direction);
    if (score > bestScore) {
      bestScore = score;
      best = ports[index];
    }
  }
  return best;
}

export function isSameBond(bond: Bond, firstId: string, secondId: string): boolean {
  return (bond.a === firstId && bond.b === secondId) || (bond.a === secondId && bond.b === firstId);
}

export function ringPosition(index: number, count: number, radius = 3.2): Vec3 {
  const angle = (index / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2;
  const layer = index % 2 === 0 ? 1 : -1;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.62, layer * 0.9];
}

export type ConnectionDirection = 'selected-to-other' | 'other-to-selected';

export function connectionDirection(
  selected: Atom,
  other: Atom,
  bonds: Bond[],
): ConnectionDirection | null {
  if (selected.id === other.id) return null;
  if (bonds.some((bond) => isSameBond(bond, selected.id, other.id))) return null;
  const selectedBonds = bonds.filter((bond) => bond.a === selected.id || bond.b === selected.id);
  const otherBonds = bonds.filter((bond) => bond.a === other.id || bond.b === other.id);
  const selectedPorts = portsFor(selected.element);
  const otherPorts = portsFor(other.element);
  const selectedFree = selectedPorts.length - selectedBonds.length;
  const otherFree = otherPorts.length - otherBonds.length;
  if (selectedBonds.length === 0 && otherFree > 0 && otherPorts.length >= selectedPorts.length) {
    return 'selected-to-other';
  }
  if (otherBonds.length === 0 && selectedFree > 0) {
    return 'other-to-selected';
  }
  return null;
}
