import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Atom } from '../../chem/types';
import { frameFromCamera, nearestHostOnScreen } from '../../scene/screenSnap';

function topDownFrame() {
  const camera = new THREE.PerspectiveCamera(42, 1440 / 900, 0.1, 100);
  camera.position.set(0, 10, 0.001);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return frameFromCamera(camera, { left: 0, top: 0, width: 1440, height: 900 });
}

function atom(id: string, element: Atom['element'], position: [number, number, number]): Atom {
  return { id, element, position };
}

describe('screen-space snap fallback', () => {
  it('finds a host hidden directly behind the drop point', () => {
    const atoms = [
      atom('o', 'O', [0, 0, 0]),
      atom('h', 'H', [0, 3, 0]),
    ];
    const frame = topDownFrame();
    const oxygen = frame.project([0, 0, 0]);
    expect(oxygen.visible).toBe(true);
    expect(
      nearestHostOnScreen({ x: oxygen.x, y: oxygen.y }, 'h', atoms, [], frame),
    ).toBe('o');
  });

  it('ignores distant, bonded, and full hosts', () => {
    const atoms = [
      atom('o', 'O', [0, 0, 0]),
      atom('h', 'H', [0, 3, 0]),
    ];
    const frame = topDownFrame();
    expect(nearestHostOnScreen({ x: 10, y: 10 }, 'h', atoms, [], frame)).toBeNull();
    expect(
      nearestHostOnScreen({ x: 720, y: 450 }, 'h', atoms, [{ id: 'b1', a: 'h', b: 'o', order: 1 }], frame),
    ).toBeNull();
  });
});
