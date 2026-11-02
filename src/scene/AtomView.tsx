import { useCursor } from '@react-three/drei';
import { type ThreeEvent, useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { getElement } from '../chem/elements';
import type { Atom } from '../chem/types';
import { useReducedMotion } from '../lib/useReducedMotion';
import { AtomLabel } from './AtomLabel';

interface AtomViewProps {
  atom: Atom;
  selected?: boolean;
  interactive?: boolean;
  draggable?: boolean;
  showLabel?: boolean;
  onAtomPointerDown?: (atom: Atom, event: ThreeEvent<PointerEvent>) => void;
}

export function AtomView({
  atom,
  selected = false,
  interactive = false,
  draggable = false,
  showLabel = true,
  onAtomPointerDown,
}: AtomViewProps) {
  const element = getElement(atom.element);
  const [hovered, setHovered] = useState(false);
  const halo = useRef<THREE.Group>(null);
  const reducedMotion = useReducedMotion();
  useCursor(interactive && hovered, draggable ? 'grab' : 'pointer', 'auto');

  useFrame((state) => {
    if (!halo.current || !selected) return;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(state.clock.elapsedTime * 2.4) * 0.035;
    halo.current.scale.setScalar(pulse);
  });

  const labelColor = atom.element === 'H' || atom.element === 'Ag' ? '#2b2920' : '#fff9ec';

  return (
    <group
      position={atom.position}
      onPointerDown={
        interactive
          ? (event) => {
              event.stopPropagation();
              onAtomPointerDown?.(atom, event);
            }
          : undefined
      }
      onPointerOver={
        interactive
          ? (event) => {
              event.stopPropagation();
              setHovered(true);
            }
          : undefined
      }
      onPointerOut={interactive ? () => setHovered(false) : undefined}
    >
      <mesh castShadow={false} receiveShadow={false}>
        <sphereGeometry args={[element.radius, 32, 24]} />
        <meshStandardMaterial
          color={element.color}
          roughness={0.34}
          metalness={0.08}
          emissive={element.deepColor}
          emissiveIntensity={0.1}
        />
      </mesh>
      <mesh scale={1.22}>
        <sphereGeometry args={[element.radius, 20, 16]} />
        <meshBasicMaterial
          color={element.color}
          transparent
          opacity={hovered ? 0.16 : 0.08}
          depthWrite={false}
        />
      </mesh>
      {selected ? (
        <group ref={halo}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[element.radius * 1.38, 0.018, 8, 48]} />
            <meshBasicMaterial color="#c08e3a" transparent opacity={0.72} />
          </mesh>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[element.radius * 1.38, 0.018, 8, 48]} />
            <meshBasicMaterial color="#c08e3a" transparent opacity={0.48} />
          </mesh>
          <mesh scale={1.3}>
            <sphereGeometry args={[element.radius, 20, 16]} />
            <meshBasicMaterial color="#e0b866" transparent opacity={0.07} depthWrite={false} />
          </mesh>
        </group>
      ) : null}
      {showLabel ? (
        <AtomLabel symbol={element.symbol} color={labelColor} scale={0.5 + element.radius * 0.45} />
      ) : null}
    </group>
  );
}
