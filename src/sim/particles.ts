import type { Phase, Vec3 } from '../chem/types';
import { clamp, phaseForTemperature, thermalSpeed } from './temperature';

export interface ParticleState {
  count: number;
  positions: Float32Array;
  velocities: Float32Array;
  base: Float32Array;
  bounds: Vec3;
}

export interface ParticleMetrics {
  order: number;
  speed: number;
}

export function createParticles(count: number, bounds: Vec3, temperature: number): ParticleState {
  const safeCount = Math.max(1, Math.min(2000, Math.floor(count)));
  const positions = new Float32Array(safeCount * 3);
  const velocities = new Float32Array(safeCount * 3);
  const base = buildLattice(safeCount, bounds);
  const random = mulberry32(1337 + safeCount);
  const phase = phaseForTemperature(temperature);
  for (let index = 0; index < safeCount; index += 1) {
    const offset = index * 3;
    if (phase === 'solid') {
      positions[offset] = base[offset] + (random() - 0.5) * 0.04;
      positions[offset + 1] = base[offset + 1] + (random() - 0.5) * 0.04;
      positions[offset + 2] = base[offset + 2] + (random() - 0.5) * 0.04;
    } else if (phase === 'liquid') {
      positions[offset] = (random() * 2 - 1) * bounds[0] * 0.88;
      positions[offset + 1] = -bounds[1] * 0.9 + random() * bounds[1] * 0.95;
      positions[offset + 2] = (random() * 2 - 1) * bounds[2] * 0.88;
    } else {
      positions[offset] = (random() * 2 - 1) * bounds[0] * 0.94;
      positions[offset + 1] = (random() * 2 - 1) * bounds[1] * 0.9;
      positions[offset + 2] = (random() * 2 - 1) * bounds[2] * 0.94;
    }
    velocities[offset] = (random() * 2 - 1) * 0.65;
    velocities[offset + 1] = (random() * 2 - 1) * 0.65;
    velocities[offset + 2] = (random() * 2 - 1) * 0.65;
  }
  return { count: safeCount, positions, velocities, base, bounds: [...bounds] };
}

export function stepParticles(
  state: ParticleState,
  delta: number,
  temperature: number,
  bounds: Vec3,
): void {
  const dt = clamp(delta, 1 / 240, 1 / 30);
  state.bounds = bounds;
  const phase: Phase = phaseForTemperature(temperature);
  const solidAmount = phase === 'solid' ? 1 : clamp((6 - temperature) / 10, 0, 1);
  const gasAmount = clamp((temperature - 88) / 22, 0, 1);
  const thermal = thermalSpeed(temperature);
  const positions = state.positions;
  const velocities = state.velocities;
  const base = state.base;
  const count = state.count;

  if (solidAmount > 0.02) {
    const spring = 36 * solidAmount;
    const damping = 1 - Math.min(0.96, 7 * dt);
    const jitter = 0.16 * thermal + 0.06;
    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      for (let axis = 0; axis < 3; axis += 1) {
        const displacement = base[offset + axis] - positions[offset + axis];
        velocities[offset + axis] =
          (velocities[offset + axis] + displacement * spring * dt) * damping +
          (Math.random() - 0.5) * jitter * dt * 10;
      }
    }
  }

  const fluidAmount = 1 - solidAmount;
  if (fluidAmount > 0.02) {
    const cellSize = 0.52;
    const repelDistance = 0.5;
    const repelStrength = phase === 'gas' ? 5.5 : 9;
    const attractionDistance = 0.95;
    const attractionStrength = phase === 'liquid' ? 1.15 : phase === 'solid' ? 1.8 : 0;
    const gravity = phase === 'liquid' ? -2.1 : 0;
    const brownian = (phase === 'gas' ? 3 : 1.35) * thermal;
    const brownianForce = brownian * fluidAmount;
    const grid = new Map<number, number[]>();
    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      const key = hashCell(
        Math.floor(positions[offset] / cellSize),
        Math.floor(positions[offset + 1] / cellSize),
        Math.floor(positions[offset + 2] / cellSize),
      );
      const bucket = grid.get(key);
      if (bucket) bucket.push(index);
      else grid.set(key, [index]);
      velocities[offset + 1] += gravity * dt * fluidAmount;
      velocities[offset] += (Math.random() - 0.5) * brownianForce * dt * 8;
      velocities[offset + 1] += (Math.random() - 0.5) * brownianForce * dt * 8;
      velocities[offset + 2] += (Math.random() - 0.5) * brownianForce * dt * 8;
    }
    for (let first = 0; first < count; first += 1) {
      const offsetA = first * 3;
      const cellX = Math.floor(positions[offsetA] / cellSize);
      const cellY = Math.floor(positions[offsetA + 1] / cellSize);
      const cellZ = Math.floor(positions[offsetA + 2] / cellSize);
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dz = -1; dz <= 1; dz += 1) {
            const bucket = grid.get(hashCell(cellX + dx, cellY + dy, cellZ + dz));
            if (!bucket) continue;
            for (let bucketIndex = 0; bucketIndex < bucket.length; bucketIndex += 1) {
              const second = bucket[bucketIndex];
              if (second <= first) continue;
              const offsetB = second * 3;
              const deltaX = positions[offsetB] - positions[offsetA];
              const deltaY = positions[offsetB + 1] - positions[offsetA + 1];
              const deltaZ = positions[offsetB + 2] - positions[offsetA + 2];
              const distanceSquared = deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;
              if (distanceSquared < 0.000001) continue;
              const distanceValue = Math.sqrt(distanceSquared);
              if (distanceValue < repelDistance) {
                const push = (1 - distanceValue / repelDistance) * repelStrength;
                const nx = deltaX / distanceValue;
                const ny = deltaY / distanceValue;
                const nz = deltaZ / distanceValue;
                velocities[offsetA] -= nx * push * dt * 3;
                velocities[offsetA + 1] -= ny * push * dt * 3;
                velocities[offsetA + 2] -= nz * push * dt * 3;
                velocities[offsetB] += nx * push * dt * 3;
                velocities[offsetB + 1] += ny * push * dt * 3;
                velocities[offsetB + 2] += nz * push * dt * 3;
              } else if (
                attractionStrength > 0 &&
                distanceValue < attractionDistance &&
                phase === 'liquid'
              ) {
                const pull = (1 - distanceValue / attractionDistance) * attractionStrength;
                const nx = deltaX / distanceValue;
                const ny = deltaY / distanceValue;
                const nz = deltaZ / distanceValue;
                velocities[offsetA] += nx * pull * dt * 3;
                velocities[offsetA + 1] += ny * pull * dt * 3;
                velocities[offsetA + 2] += nz * pull * dt * 3;
                velocities[offsetB] -= nx * pull * dt * 3;
                velocities[offsetB + 1] -= ny * pull * dt * 3;
                velocities[offsetB + 2] -= nz * pull * dt * 3;
              }
            }
          }
        }
      }
    }
  }

  const maxSpeed = 1.6 + thermal * 2.8 + gasAmount * 0.5;
  const damping = Math.pow(0.9975, dt * 60);
  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    for (let axis = 0; axis < 3; axis += 1) {
      velocities[offset + axis] *= damping;
      const speed = Math.abs(velocities[offset + axis]);
      if (speed > maxSpeed)
        velocities[offset + axis] = Math.sign(velocities[offset + axis]) * maxSpeed;
      positions[offset + axis] += velocities[offset + axis] * dt;
      const half = bounds[axis];
      if (positions[offset + axis] < -half) {
        positions[offset + axis] = -half;
        velocities[offset + axis] = Math.abs(velocities[offset + axis]) * 0.72;
      } else if (positions[offset + axis] > half) {
        positions[offset + axis] = half;
        velocities[offset + axis] = -Math.abs(velocities[offset + axis]) * 0.72;
      }
      if (!Number.isFinite(positions[offset + axis])) positions[offset + axis] = 0;
      if (!Number.isFinite(velocities[offset + axis])) velocities[offset + axis] = 0;
    }
  }
}

export function particleMetrics(state: ParticleState): ParticleMetrics {
  const count = state.count;
  let totalSquared = 0;
  let totalSpeed = 0;
  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    const dx = state.positions[offset] - state.base[offset];
    const dy = state.positions[offset + 1] - state.base[offset + 1];
    const dz = state.positions[offset + 2] - state.base[offset + 2];
    totalSquared += dx * dx + dy * dy + dz * dz;
    totalSpeed += Math.hypot(
      state.velocities[offset],
      state.velocities[offset + 1],
      state.velocities[offset + 2],
    );
  }
  const rms = Math.sqrt(totalSquared / Math.max(1, count));
  return {
    order: Math.round(Math.exp(-rms) * 100) / 100,
    speed: Math.round((totalSpeed / Math.max(1, count)) * 100) / 100,
  };
}

export function particlesAreFinite(state: ParticleState): boolean {
  for (let index = 0; index < state.positions.length; index += 1) {
    if (!Number.isFinite(state.positions[index])) return false;
    if (!Number.isFinite(state.velocities[index])) return false;
  }
  return true;
}

function buildLattice(count: number, bounds: Vec3): Float32Array {
  const lattice = new Float32Array(count * 3);
  const nx = Math.max(2, Math.ceil(Math.cbrt(count * 1.4)));
  const nz = Math.max(2, Math.ceil(Math.cbrt(count * 1.1)));
  let ny = Math.max(2, Math.ceil(count / (nx * nz)));
  while (nx * ny * nz < count) ny += 1;
  const extentX = bounds[0] * 1.55;
  const extentY = bounds[1] * 1.35;
  const extentZ = bounds[2] * 1.55;
  const stepX = nx > 1 ? extentX / (nx - 1) : 0;
  const stepY = ny > 1 ? extentY / (ny - 1) : 0;
  const stepZ = nz > 1 ? extentZ / (nz - 1) : 0;
  let index = 0;
  for (let y = 0; y < ny && index < count; y += 1) {
    for (let z = 0; z < nz && index < count; z += 1) {
      for (let x = 0; x < nx && index < count; x += 1) {
        const offset = index * 3;
        lattice[offset] = -extentX / 2 + x * stepX;
        lattice[offset + 1] = -extentY / 2 + y * stepY;
        lattice[offset + 2] = -extentZ / 2 + z * stepZ;
        index += 1;
      }
    }
  }
  return lattice;
}

function hashCell(x: number, y: number, z: number): number {
  return (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}
