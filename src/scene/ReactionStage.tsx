import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ReactionData, ReactionActor, Vec3 } from '../chem/types';
import { actorOpacity, clamp01, sampleKeyframes, smoothstep } from '../lib/timeline';
import { useReactionStore } from '../stores/reactionStore';
import { MoleculeModel } from './MoleculeModel';
import { WorldLabel } from './WorldLabel';
import { SceneLights } from './SceneLights';

interface ReactionStageProps {
  reaction: ReactionData;
  showLabels: boolean;
}

const WATER_ATOMS = [
  { id: 'wo', element: 'O' as const, position: [0, 0, 0] as Vec3 },
  { id: 'wh1', element: 'H' as const, position: [0.42, 0.33, 0] as Vec3 },
  { id: 'wh2', element: 'H' as const, position: [-0.42, 0.33, 0] as Vec3 },
];

const WATER_BONDS = [
  { id: 'wb1', a: 'wo', b: 'wh1', order: 1 as const },
  { id: 'wb2', a: 'wo', b: 'wh2', order: 1 as const },
];

export function ReactionStage({ reaction, showLabels }: ReactionStageProps) {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 1.4, 7.8], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.domElement.style.touchAction = 'none';
      }}
      role="img"
      aria-label={`${reaction.titleKo} 3D 반응 극장`}
    >
      <SceneLights />
      <ReactionField reaction={reaction} showLabels={showLabels} />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={5.5}
        maxDistance={11.5}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}

function ReactionField({ reaction, showLabels }: ReactionStageProps) {
  const actorGroups = useRef<(THREE.Group | null)[]>([]);
  const actorMaterials = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const productGroups = useRef<(THREE.Group | null)[]>([]);
  const precipitateRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () => (reaction.precipitate ? makePrecipitateSeeds(reaction.precipitate.count) : null),
    [reaction],
  );

  useFrame((_, delta) => {
    const store = useReactionStore.getState();
    if (store.playing) store.tick(Math.min(delta, 1 / 30));
    const progress = useReactionStore.getState().progress;

    reaction.actors.forEach((actor, index) => {
      const group = actorGroups.current[index];
      const material = actorMaterials.current[index];
      if (!group || !material) return;
      const position = sampleKeyframes(actor.keyframes, progress);
      group.position.set(position[0], position[1], position[2]);
      const opacity = actorOpacity(actor, progress);
      material.opacity = opacity;
      material.transparent = opacity < 1;
      group.visible = opacity > 0.01;
    });

    reaction.products?.forEach((product, index) => {
      const group = productGroups.current[index];
      if (!group) return;
      const position = sampleKeyframes(product.keyframes, progress);
      group.position.set(position[0], position[1], position[2]);
      const appear = product.appear ?? [0, 0.1];
      const local = clamp01((progress - appear[0]) / Math.max(0.001, appear[1] - appear[0]));
      const scale = smoothstep(local);
      group.scale.setScalar(scale);
      group.visible = local > 0.01;
    });

    if (reaction.precipitate && seeds && precipitateRef.current) {
      const mesh = precipitateRef.current;
      const { from, startT, endT, settleY } = reaction.precipitate;
      const local = clamp01((progress - startT) / Math.max(0.001, endT - startT));
      if (progress < startT) {
        mesh.count = 0;
      } else {
        mesh.count = reaction.precipitate.count;
        for (let index = 0; index < seeds.count; index += 1) {
          const delay = seeds.delay[index] * 0.58;
          const fall = clamp01((local - delay) / Math.max(0.05, 1 - delay));
          const sink = fall * fall;
          const x =
            from[0] + seeds.offsetX[index] + (seeds.settleX[index] - seeds.offsetX[index]) * sink;
          const y =
            from[1] + seeds.offsetY[index] + (settleY - from[1] - seeds.offsetY[index]) * sink;
          const z =
            from[2] + seeds.offsetZ[index] + (seeds.settleZ[index] - seeds.offsetZ[index]) * sink;
          dummy.position.set(x, y, z);
          dummy.scale.setScalar(seeds.size[index] * (fall > 0 ? 1 : 0.35));
          dummy.updateMatrix();
          mesh.setMatrixAt(index, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      <Beaker />
      {reaction.actors.map((actor, index) => (
        <IonActor
          key={actor.id}
          actor={actor}
          showLabels={showLabels}
          groupRef={(node) => {
            actorGroups.current[index] = node;
          }}
          materialRef={(node) => {
            actorMaterials.current[index] = node;
          }}
        />
      ))}
      {reaction.products?.map((product, index) => (
        <Product
          key={`${product.label}-${index}`}
          label={product.label}
          color={product.color}
          showLabels={showLabels}
          groupRef={(node) => {
            productGroups.current[index] = node;
          }}
        />
      ))}
      {reaction.precipitate && seeds ? (
        <instancedMesh
          ref={precipitateRef}
          args={[undefined, undefined, reaction.precipitate.count]}
          count={0}
          frustumCulled={false}
        >
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial
            color={reaction.precipitate.color}
            roughness={0.82}
            metalness={0.04}
          />
        </instancedMesh>
      ) : null}
    </group>
  );
}

interface IonActorProps {
  actor: ReactionActor;
  showLabels: boolean;
  groupRef: (node: THREE.Group | null) => void;
  materialRef: (node: THREE.MeshStandardMaterial | null) => void;
}

function IonActor({ actor, showLabels, groupRef, materialRef }: IonActorProps) {
  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[actor.radius, 28, 20]} />
        <meshStandardMaterial
          ref={materialRef}
          color={actor.color}
          roughness={0.34}
          metalness={0.08}
          emissive={actor.color}
          emissiveIntensity={0.12}
          transparent
        />
      </mesh>
      <mesh scale={1.25}>
        <sphereGeometry args={[actor.radius, 16, 12]} />
        <meshBasicMaterial color={actor.color} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      {showLabels ? (
        <group position={[0, actor.radius + 0.3, 0]}>
          <WorldLabel text={actor.label} color={actor.color} width={0.82} height={0.29} />
        </group>
      ) : null}
    </group>
  );
}

interface ProductProps {
  label: string;
  color: string;
  showLabels: boolean;
  groupRef: (node: THREE.Group | null) => void;
}

function Product({ label, color, showLabels, groupRef }: ProductProps) {
  if (label === 'H₂O') {
    return (
      <group ref={groupRef}>
        <group scale={0.62}>
          <MoleculeModel atoms={WATER_ATOMS} bonds={WATER_BONDS} showLabels={false} />
        </group>
        {showLabels ? (
          <group position={[0, 0.88, 0]}>
            <WorldLabel text="H₂O" color="#c9b892" width={0.8} height={0.3} />
          </group>
        ) : null}
      </group>
    );
  }
  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.13, 20, 14]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh scale={1.9}>
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      {showLabels ? (
        <group position={[0, 0.4, 0]}>
          <WorldLabel
            text={label}
            color="#e9e1d2"
            width={label.length > 4 ? 1.12 : 0.82}
            height={0.3}
          />
        </group>
      ) : null}
    </group>
  );
}

function Beaker() {
  return (
    <group>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[2.45, 2.2, 0.22, 80, 1]} />
        <meshStandardMaterial color="#c9d2c0" transparent opacity={0.32} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[2.4, 2.25, 3.9, 80, 1, true]} />
        <meshStandardMaterial
          color="#d7e0d0"
          transparent
          opacity={0.09}
          roughness={0.08}
          metalness={0.02}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[2.22, 2.08, 3.2, 80, 1]} />
        <meshStandardMaterial
          color="#8ea294"
          transparent
          opacity={0.11}
          roughness={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 1.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.22, 80]} />
        <meshStandardMaterial
          color="#9fb2a2"
          transparent
          opacity={0.14}
          roughness={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 2.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.4, 0.025, 8, 96]} />
        <meshStandardMaterial color="#d3dfcd" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, -2.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.55, 80]} />
        <meshStandardMaterial color="#1d261b" roughness={0.9} />
      </mesh>
    </group>
  );
}

interface PrecipitateSeeds {
  count: number;
  offsetX: Float32Array;
  offsetY: Float32Array;
  offsetZ: Float32Array;
  settleX: Float32Array;
  settleZ: Float32Array;
  delay: Float32Array;
  size: Float32Array;
}

function makePrecipitateSeeds(count: number): PrecipitateSeeds {
  let seed = 977;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const offsetX = new Float32Array(count);
  const offsetY = new Float32Array(count);
  const offsetZ = new Float32Array(count);
  const settleX = new Float32Array(count);
  const settleZ = new Float32Array(count);
  const delay = new Float32Array(count);
  const size = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = random() * 0.48;
    offsetX[index] = Math.cos(angle) * radius;
    offsetY[index] = (random() * 2 - 1) * 0.22;
    offsetZ[index] = Math.sin(angle) * radius;
    const settleAngle = random() * Math.PI * 2;
    const settleRadius = Math.sqrt(random()) * 1.15;
    settleX[index] = Math.cos(settleAngle) * settleRadius;
    settleZ[index] = Math.sin(settleAngle) * settleRadius * 0.72;
    delay[index] = random();
    size[index] = 0.032 + random() * 0.05;
  }
  return { count, offsetX, offsetY, offsetZ, settleX, settleZ, delay, size };
}
