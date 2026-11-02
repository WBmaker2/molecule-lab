import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useReducedMotion } from '../lib/useReducedMotion';

export function StagePedestal() {
  const dust = useRef<THREE.Points>(null);
  const reducedMotion = useReducedMotion();
  const positions = useMemo(() => {
    const values = new Float32Array(72 * 3);
    let seed = 41;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let index = 0; index < 72; index += 1) {
      values[index * 3] = (random() * 2 - 1) * 4.6;
      values[index * 3 + 1] = random() * 3.6 - 2;
      values[index * 3 + 2] = (random() * 2 - 1) * 3.8;
    }
    return values;
  }, []);

  useFrame((state) => {
    if (!dust.current || reducedMotion) return;
    dust.current.rotation.y = state.clock.elapsedTime * 0.025;
  });

  return (
    <group>
      <mesh position={[0, -2.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.55, 72]} />
        <meshStandardMaterial color="#222b1e" roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh position={[0, -2.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.32, 3.46, 96]} />
        <meshBasicMaterial color="#b28a4d" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -2.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.1, 2.12, 96]} />
        <meshBasicMaterial color="#7d8a6a" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
      <points ref={dust}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#d3b67e"
          size={0.028}
          transparent
          opacity={0.5}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
