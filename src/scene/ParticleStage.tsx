import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../chem/types';
import {
  createParticles,
  particleMetrics,
  stepParticles,
  type ParticleState,
} from '../sim/particles';
import { particleColor, volumeForTemperature } from '../sim/temperature';
import { SceneLights } from './SceneLights';

interface ParticleStageProps {
  temperature: number;
  count: number;
  paused: boolean;
  onMetrics?: (metrics: { fps: number; order: number; speed: number }) => void;
}

const BASE_BOUNDS: Vec3 = [2.8, 1.65, 1.65];

function boundsFor(temperature: number): Vec3 {
  const scale = Math.sqrt(volumeForTemperature(temperature));
  return [BASE_BOUNDS[0] * scale, BASE_BOUNDS[1] * scale, BASE_BOUNDS[2] * scale];
}

export function ParticleStage({ temperature, count, paused, onMetrics }: ParticleStageProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.6, 7.8], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.domElement.style.touchAction = 'none';
      }}
      role="img"
      aria-label="온도에 따른 입자 운동 3D 무대"
    >
      <SceneLights />
      <ParticleField
        temperature={temperature}
        count={count}
        paused={paused}
        onMetrics={onMetrics}
      />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={5.8}
        maxDistance={11}
        target={[0, 0, 0]}
        autoRotate={false}
      />
    </Canvas>
  );
}

function ParticleField({ temperature, count, paused, onMetrics }: ParticleStageProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const stateRef = useRef<ParticleState>(
    createParticles(count, boundsFor(temperature), temperature),
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const lastColorTemperature = useRef(Number.NaN);
  const frames = useRef(0);
  const elapsed = useRef(0);
  const bounds = useMemo(() => boundsFor(temperature), [temperature]);

  useEffect(() => {
    stateRef.current = createParticles(count, boundsFor(temperature), temperature);
    lastColorTemperature.current = Number.NaN;
    if (meshRef.current) {
      meshRef.current.count = stateRef.current.count;
    }
  }, [count]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.count = count;
    const base = new THREE.Color(particleColor(temperature));
    for (let index = 0; index < count; index += 1) {
      color.copy(base).offsetHSL(0, 0, ((index % 7) - 3) * 0.012);
      mesh.setColorAt(index, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    lastColorTemperature.current = temperature;
  }, [color, count, temperature]);

  useFrame((_, rawDelta) => {
    const mesh = meshRef.current;
    const state = stateRef.current;
    if (!mesh) return;
    const delta = Math.min(rawDelta, 1 / 30);
    if (!paused) {
      stepParticles(state, delta, temperature, bounds);
    } else {
      clampToBounds(state, bounds);
    }
    for (let index = 0; index < state.count; index += 1) {
      const offset = index * 3;
      dummy.position.set(
        state.positions[offset],
        state.positions[offset + 1],
        state.positions[offset + 2],
      );
      const scale = 0.92 + (index % 5) * 0.035;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    if (Math.abs(temperature - lastColorTemperature.current) > 1.2) {
      lastColorTemperature.current = temperature;
      const base = new THREE.Color(particleColor(temperature));
      for (let index = 0; index < state.count; index += 1) {
        color.copy(base).offsetHSL(0, 0, ((index % 7) - 3) * 0.012);
        mesh.setColorAt(index, color);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    frames.current += 1;
    elapsed.current += rawDelta;
    if (elapsed.current >= 0.5) {
      const metrics = particleMetrics(state);
      onMetrics?.({
        fps: Math.round(frames.current / elapsed.current),
        order: metrics.order,
        speed: metrics.speed,
      });
      frames.current = 0;
      elapsed.current = 0;
    }
  });

  return (
    <group>
      <InstancedParticles meshRef={meshRef} count={count} />
      <Chamber bounds={bounds} temperature={temperature} />
    </group>
  );
}

interface InstancedParticlesProps {
  meshRef: React.RefObject<THREE.InstancedMesh | null>;
  count: number;
}

function InstancedParticles({ meshRef, count }: InstancedParticlesProps) {
  return (
    <instancedMesh
      ref={meshRef}
      key={count}
      args={[undefined, undefined, count]}
      count={count}
      frustumCulled={false}
    >
      <icosahedronGeometry args={[0.062, 1]} />
      <meshStandardMaterial color="#ffffff" roughness={0.36} metalness={0.08} />
    </instancedMesh>
  );
}

function Chamber({ bounds, temperature }: { bounds: Vec3; temperature: number }) {
  const edgePositions = useMemo(() => {
    const [x, y, z] = bounds;
    const corners: [number, number, number][] = [
      [-x, -y, -z],
      [x, -y, -z],
      [x, -y, z],
      [-x, -y, z],
      [-x, y, -z],
      [x, y, -z],
      [x, y, z],
      [-x, y, z],
    ];
    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];
    const values = new Float32Array(edges.length * 6);
    edges.forEach(([first, second], edgeIndex) => {
      const offset = edgeIndex * 6;
      values[offset] = corners[first][0];
      values[offset + 1] = corners[first][1];
      values[offset + 2] = corners[first][2];
      values[offset + 3] = corners[second][0];
      values[offset + 4] = corners[second][1];
      values[offset + 5] = corners[second][2];
    });
    return values;
  }, [bounds]);

  const glow = particleColor(temperature);

  return (
    <group>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#c4b28d" transparent opacity={0.34} />
      </lineSegments>
      <mesh scale={[bounds[0] * 2, bounds[1] * 2, bounds[2] * 2]}>
        <boxGeometry />
        <meshStandardMaterial
          color="#bac8b0"
          transparent
          opacity={0.035}
          roughness={0.1}
          metalness={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, -bounds[1] - 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[bounds[0] * 2.1, bounds[2] * 2.1]} />
        <meshBasicMaterial
          color={glow}
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, -bounds[1] - 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[bounds[0] * 1.15, 64]} />
        <meshStandardMaterial color="#20291d" roughness={0.92} metalness={0.03} />
      </mesh>
    </group>
  );
}

function clampToBounds(state: ParticleState, bounds: Vec3): void {
  for (let index = 0; index < state.count; index += 1) {
    const offset = index * 3;
    for (let axis = 0; axis < 3; axis += 1) {
      state.positions[offset + axis] = Math.max(
        -bounds[axis],
        Math.min(bounds[axis], state.positions[offset + axis]),
      );
    }
  }
}
