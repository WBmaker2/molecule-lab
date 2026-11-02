import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Atom, Bond } from '../chem/types';
import { AtomView } from './AtomView';
import { BondView } from './BondView';
import { AngleOverlay, PolarityOverlay } from './Overlays';

interface MoleculeModelProps {
  atoms: Atom[];
  bonds: Bond[];
  selectedAtomId?: string | null;
  showAngles?: boolean;
  showPolarity?: boolean;
  showLabels?: boolean;
  interactive?: boolean;
  onAtomPointerDown?: (atom: Atom, event: ThreeEvent<PointerEvent>) => void;
}

export function MoleculeModel({
  atoms,
  bonds,
  selectedAtomId = null,
  showAngles = false,
  showPolarity = false,
  showLabels = true,
  interactive = false,
  onAtomPointerDown,
}: MoleculeModelProps) {
  const byId = useMemo(() => new Map(atoms.map((atom) => [atom.id, atom])), [atoms]);
  const degrees = useMemo(() => {
    const map = new Map<string, number>();
    for (const atom of atoms) map.set(atom.id, 0);
    for (const bond of bonds) {
      map.set(bond.a, (map.get(bond.a) ?? 0) + 1);
      map.set(bond.b, (map.get(bond.b) ?? 0) + 1);
    }
    return map;
  }, [atoms, bonds]);

  return (
    <group>
      {bonds.map((bond) => {
        const first = byId.get(bond.a);
        const second = byId.get(bond.b);
        if (!first || !second) return null;
        return <BondView key={bond.id} bond={bond} first={first} second={second} />;
      })}
      {atoms.map((atom) => (
        <AtomView
          key={atom.id}
          atom={atom}
          selected={selectedAtomId === atom.id}
          interactive={interactive}
          draggable={(degrees.get(atom.id) ?? 0) === 0}
          showLabel={showLabels}
          onAtomPointerDown={onAtomPointerDown}
        />
      ))}
      <AngleOverlay
        atoms={atoms}
        bonds={bonds}
        selectedAtomId={selectedAtomId}
        visible={showAngles}
      />
      <PolarityOverlay atoms={atoms} bonds={bonds} visible={showPolarity} />
    </group>
  );
}
