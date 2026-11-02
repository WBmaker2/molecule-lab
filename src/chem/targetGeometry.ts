import { getMolecule } from './molecules';
import type { Atom, Vec3 } from './types';

export function targetRelativePosition(
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
