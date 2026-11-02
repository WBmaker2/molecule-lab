import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { computePolarity } from '../chem/analysis';
import { normalize, sub } from '../chem/bondRules';
import type { Atom, Bond, Vec3 } from '../chem/types';
import { WorldLabel } from './WorldLabel';

interface AngleOverlayProps {
  atoms: Atom[];
  bonds: Bond[];
  selectedAtomId: string | null;
  visible: boolean;
}

interface PolarityOverlayProps {
  atoms: Atom[];
  bonds: Bond[];
  visible: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);

export function AngleOverlay({ atoms, bonds, selectedAtomId, visible }: AngleOverlayProps) {
  const overlays = useMemo(() => {
    if (!visible || !selectedAtomId) return [];
    const center = atoms.find((atom) => atom.id === selectedAtomId);
    if (!center) return [];
    const byId = new Map(atoms.map((atom) => [atom.id, atom]));
    const neighbors = bonds
      .filter((bond) => bond.a === center.id || bond.b === center.id)
      .map((bond) => byId.get(bond.a === center.id ? bond.b : bond.a))
      .filter((atom): atom is Atom => Boolean(atom));
    if (neighbors.length < 2) return [];
    const results: {
      key: string;
      points: Vec3[];
      labelPosition: Vec3;
      label: string;
    }[] = [];
    for (let first = 0; first < neighbors.length; first += 1) {
      for (let second = first + 1; second < neighbors.length; second += 1) {
        const firstVector = sub(neighbors[first].position, center.position);
        const secondVector = sub(neighbors[second].position, center.position);
        const angle = angleBetween(firstVector, secondVector);
        const radius = 0.66;
        const points = arcPoints(center.position, firstVector, secondVector, radius, angle);
        const midpoint = points[Math.floor(points.length / 2)] ?? center.position;
        results.push({
          key: `${neighbors[first].id}-${neighbors[second].id}`,
          points,
          labelPosition: [midpoint[0], midpoint[1] + 0.1, midpoint[2]],
          label: `${angle.toFixed(1)}°`,
        });
      }
    }
    return results;
  }, [atoms, bonds, selectedAtomId, visible]);

  if (overlays.length === 0) return null;

  return (
    <group>
      {overlays.map((overlay) => (
        <group key={overlay.key}>
          <Line points={overlay.points} color="#d3a24e" lineWidth={1.8} transparent opacity={0.9} />
          <group position={overlay.labelPosition}>
            <WorldLabel text={overlay.label} color="#f4d798" width={0.74} height={0.27} />
          </group>
        </group>
      ))}
    </group>
  );
}

export function PolarityOverlay({ atoms, bonds, visible }: PolarityOverlayProps) {
  const polarity = useMemo(() => computePolarity(atoms, bonds), [atoms, bonds]);
  const centroid = useMemo<Vec3>(() => {
    if (atoms.length === 0) return [0, 0, 0];
    const sum = atoms.reduce<Vec3>(
      (accumulator, atom) => [
        accumulator[0] + atom.position[0],
        accumulator[1] + atom.position[1],
        accumulator[2] + atom.position[2],
      ],
      [0, 0, 0],
    );
    return [sum[0] / atoms.length, sum[1] / atoms.length, sum[2] / atoms.length];
  }, [atoms]);

  if (!visible) return null;

  const net = (() => {
    if (polarity.magnitude < 0.28) return null;
    const direction = normalize(polarity.vector);
    const visualLength = Math.min(2.2, Math.max(0.7, polarity.magnitude * 1.5));
    const start: Vec3 = [
      centroid[0] + direction[0] * 0.18,
      centroid[1] + direction[1] * 0.18,
      centroid[2] + direction[2] * 0.18,
    ];
    const end: Vec3 = [
      start[0] + direction[0] * visualLength,
      start[1] + direction[1] * visualLength,
      start[2] + direction[2] * visualLength,
    ];
    return { start, end, labelPosition: end, magnitude: polarity.magnitude };
  })();

  return (
    <group>
      {polarity.bondDipoles.map((dipole, index) => {
        const direction = normalize(sub(dipole.to, dipole.from));
        const distance = Math.hypot(
          dipole.to[0] - dipole.from[0],
          dipole.to[1] - dipole.from[1],
          dipole.to[2] - dipole.from[2],
        );
        const trim = Math.min(0.38, distance * 0.32);
        const start: Vec3 = [
          dipole.from[0] + direction[0] * trim,
          dipole.from[1] + direction[1] * trim,
          dipole.from[2] + direction[2] * trim,
        ];
        const end: Vec3 = [
          dipole.to[0] - direction[0] * trim,
          dipole.to[1] - direction[1] * trim,
          dipole.to[2] - direction[2] * trim,
        ];
        if (Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2]) < 0.12) {
          return null;
        }
        return (
          <Arrow3D
            key={index}
            start={start}
            end={end}
            color="#d3a24e"
            radius={0.018}
            headLength={0.14}
          />
        );
      })}
      {net ? (
        <group>
          <Arrow3D
            start={net.start}
            end={net.end}
            color="#cf7049"
            radius={0.028}
            headLength={0.22}
          />
          <group position={net.labelPosition}>
            <WorldLabel
              text={`극성 ${net.magnitude.toFixed(2)}`}
              color="#f0b49a"
              width={0.86}
              height={0.3}
            />
          </group>
        </group>
      ) : null}
    </group>
  );
}

interface Arrow3DProps {
  start: Vec3;
  end: Vec3;
  color: string;
  radius: number;
  headLength: number;
}

function Arrow3D({ start, end, color, radius, headLength }: Arrow3DProps) {
  const geometry = useMemo(() => {
    const startVector = new THREE.Vector3(...start);
    const endVector = new THREE.Vector3(...end);
    const direction = endVector.clone().sub(startVector);
    const length = direction.length();
    if (length < 0.05) return null;
    const unit = direction.clone().normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, unit);
    const head = Math.min(headLength, length * 0.42);
    return { startVector, length, quaternion, head, shaft: Math.max(0.02, length - head) };
  }, [start, end, headLength]);

  if (!geometry) return null;

  return (
    <group position={geometry.startVector} quaternion={geometry.quaternion}>
      <mesh position={[0, geometry.shaft / 2, 0]}>
        <cylinderGeometry args={[radius, radius, geometry.shaft, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.88} />
      </mesh>
      <mesh position={[0, geometry.shaft + geometry.head / 2, 0]}>
        <coneGeometry args={[radius * 2.8, geometry.head, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

function angleBetween(first: Vec3, second: Vec3): number {
  const denominator = Math.hypot(...first) * Math.hypot(...second);
  if (denominator === 0) return 0;
  const cosine = Math.max(
    -1,
    Math.min(1, (first[0] * second[0] + first[1] * second[1] + first[2] * second[2]) / denominator),
  );
  return (Math.acos(cosine) * 180) / Math.PI;
}

function arcPoints(center: Vec3, first: Vec3, second: Vec3, radius: number, angle: number): Vec3[] {
  const firstUnit = normalize(first);
  const secondUnit = normalize(second);
  const radians = (angle * Math.PI) / 180;
  if (Math.abs(Math.sin(radians)) < 0.02) {
    const offset = Math.abs(firstUnit[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    return [
      [
        center[0] + firstUnit[0] * radius,
        center[1] + firstUnit[1] * radius,
        center[2] + firstUnit[2] * radius,
      ],
      [
        center[0] + offset[0] * radius * 0.9,
        center[1] + offset[1] * radius * 0.9,
        center[2] + offset[2] * radius * 0.9,
      ],
      [
        center[0] + secondUnit[0] * radius,
        center[1] + secondUnit[1] * radius,
        center[2] + secondUnit[2] * radius,
      ],
    ];
  }
  const points: Vec3[] = [];
  const steps = 28;
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const weightFirst = Math.sin((1 - t) * radians) / Math.sin(radians);
    const weightSecond = Math.sin(t * radians) / Math.sin(radians);
    points.push([
      center[0] + (firstUnit[0] * weightFirst + secondUnit[0] * weightSecond) * radius,
      center[1] + (firstUnit[1] * weightFirst + secondUnit[1] * weightSecond) * radius,
      center[2] + (firstUnit[2] * weightFirst + secondUnit[2] * weightSecond) * radius,
    ]);
  }
  return points;
}
