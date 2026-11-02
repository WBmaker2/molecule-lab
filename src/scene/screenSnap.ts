import * as THREE from 'three';
import { isSameBond, portsFor } from '../chem/bondRules';
import type { Atom, Bond, Vec3 } from '../chem/types';

export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ScreenFrame {
  project: (position: Vec3) => { x: number; y: number; visible: boolean };
}

export function frameFromCamera(camera: THREE.Camera, rect: ScreenRect): ScreenFrame {
  const projected = new THREE.Vector3();
  return {
    project: (position) => {
      projected.set(position[0], position[1], position[2]).project(camera);
      return {
        x: (projected.x * 0.5 + 0.5) * rect.width + rect.left,
        y: (-projected.y * 0.5 + 0.5) * rect.height + rect.top,
        visible: projected.z < 1,
      };
    },
  };
}

export function nearestHostOnScreen(
  pointer: { x: number; y: number },
  draggedId: string,
  atoms: Atom[],
  bonds: Bond[],
  frame: ScreenFrame,
  maxPixels = 90,
): string | null {
  const dragged = atoms.find((candidate) => candidate.id === draggedId);
  if (!dragged) return null;
  let bestId: string | null = null;
  let bestDistance = maxPixels;
  for (const host of atoms) {
    if (host.id === draggedId) continue;
    if (bonds.some((bond) => isSameBond(bond, draggedId, host.id))) continue;
    const hostBonds = bonds.filter((bond) => bond.a === host.id || bond.b === host.id);
    const hostPorts = portsFor(host.element);
    if (hostBonds.length >= hostPorts.length) continue;
    if (hostPorts.length < portsFor(dragged.element).length) continue;
    const screen = frame.project(host.position);
    if (!screen.visible) continue;
    const distance = Math.hypot(pointer.x - screen.x, pointer.y - screen.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = host.id;
    }
  }
  return bestId;
}
