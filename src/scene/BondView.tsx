import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { Atom, Bond } from '../chem/types';

interface BondViewProps {
  bond: Bond;
  first: Atom;
  second: Atom;
}

const UP = new THREE.Vector3(0, 1, 0);

export function BondView({ bond, first, second }: BondViewProps) {
  const geometry = useMemo(() => {
    const start = new THREE.Vector3(...first.position);
    const end = new THREE.Vector3(...second.position);
    const direction = end.clone().sub(start);
    const length = direction.length();
    if (length < 0.0001) return null;
    const unit = direction.clone().normalize();
    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, unit);
    const offsets = bond.order === 3 ? [-0.115, 0, 0.115] : bond.order === 2 ? [-0.08, 0.08] : [0];
    return { length, midpoint, quaternion, offsets };
  }, [first.position, second.position, bond.order]);

  if (!geometry) return null;

  if (bond.ionic) {
    return (
      <Line
        points={[first.position, second.position]}
        color="#b6a77f"
        lineWidth={2.4}
        dashed
        dashSize={0.16}
        gapSize={0.12}
        transparent
        opacity={0.78}
      />
    );
  }

  return (
    <group position={geometry.midpoint} quaternion={geometry.quaternion}>
      {geometry.offsets.map((offset, index) => (
        <mesh key={index} position={[offset, 0, 0]}>
          <cylinderGeometry args={[0.052, 0.052, geometry.length, 12]} />
          <meshStandardMaterial
            color="#95876e"
            roughness={0.46}
            metalness={0.18}
            emissive="#2a241c"
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}
