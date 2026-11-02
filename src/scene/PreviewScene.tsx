import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import type { MoleculeData } from '../chem/types';
import { useReducedMotion } from '../lib/useReducedMotion';
import { MoleculeModel } from './MoleculeModel';
import { SceneLights } from './SceneLights';

interface PreviewSceneProps {
  molecule: MoleculeData;
  autoRotate?: boolean;
  showLabels?: boolean;
  ariaLabel?: string;
}

export function PreviewScene({
  molecule,
  autoRotate = true,
  showLabels = true,
  ariaLabel,
}: PreviewSceneProps) {
  const reducedMotion = useReducedMotion();
  const prepared = useMemo(() => {
    const atoms = molecule.atoms.map((atom, index) => ({
      id: `p${index}`,
      element: atom.element,
      position: atom.position,
    }));
    const bonds = molecule.bonds.map((bond, index) => ({
      id: `pb${index}`,
      a: `p${bond.a}`,
      b: `p${bond.b}`,
      order: bond.order,
      ionic: bond.ionic,
    }));
    const center = atoms.reduce(
      (accumulator, atom) => [
        accumulator[0] + atom.position[0] / atoms.length,
        accumulator[1] + atom.position[1] / atoms.length,
        accumulator[2] + atom.position[2] / atoms.length,
      ],
      [0, 0, 0],
    );
    const radius = Math.max(
      0.7,
      ...atoms.map((atom) =>
        Math.hypot(
          atom.position[0] - center[0],
          atom.position[1] - center[1],
          atom.position[2] - center[2],
        ),
      ),
    );
    const scale = Math.min(1.8, 1.5 / radius);
    return { atoms, bonds, center, scale };
  }, [molecule]);

  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 1.1, 6.2], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.domElement.style.touchAction = 'none';
      }}
      role="img"
      aria-label={ariaLabel ?? `${molecule.nameKo} 분자 3D 구조`}
    >
      <SceneLights />
      <group
        scale={prepared.scale}
        position={[
          -prepared.center[0] * prepared.scale,
          -prepared.center[1] * prepared.scale,
          -prepared.center[2] * prepared.scale,
        ]}
      >
        <MoleculeModel
          atoms={prepared.atoms}
          bonds={prepared.bonds}
          showLabels={showLabels}
          showAngles={false}
          showPolarity={false}
        />
      </group>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotate && !reducedMotion}
        autoRotateSpeed={0.85}
      />
    </Canvas>
  );
}
