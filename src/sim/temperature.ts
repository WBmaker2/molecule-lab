import type { Phase } from '../chem/types';

export const MIN_TEMPERATURE = -20;
export const MAX_TEMPERATURE = 120;
export const DEFAULT_TEMPERATURE = 24;
export const MELTING_POINT = 0;
export const BOILING_POINT = 100;

export interface PhaseInfo {
  phase: Phase;
  nameKo: string;
  summaryKo: string;
  descriptionKo: string;
  motionKo: string;
}

export const PHASE_INFO: Record<Phase, PhaseInfo> = {
  solid: {
    phase: 'solid',
    nameKo: '고체',
    summaryKo: '규칙적인 배열',
    descriptionKo: '입자가 제자리에서 규칙적으로 진동합니다. 모양과 부피가 거의 변하지 않습니다.',
    motionKo: '진동 운동',
  },
  liquid: {
    phase: 'liquid',
    nameKo: '액체',
    summaryKo: '서로 미끄러지는 배열',
    descriptionKo:
      '입자 사이의 인력이 남아 있지만 자유롭게 움직입니다. 부피는 유지되고 모양은 변합니다.',
    motionKo: '구르는 운동',
  },
  gas: {
    phase: 'gas',
    nameKo: '기체',
    summaryKo: '자유롭게 퍼지는 배열',
    descriptionKo: '입자가 빠르게 운동하며 공간을 가득 채웁니다. 용기의 부피에 따라 퍼집니다.',
    motionKo: '병진 운동',
  },
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function phaseForTemperature(temperature: number): Phase {
  if (temperature < MELTING_POINT) return 'solid';
  if (temperature < BOILING_POINT) return 'liquid';
  return 'gas';
}

export function phaseInfoForTemperature(temperature: number): PhaseInfo {
  return PHASE_INFO[phaseForTemperature(temperature)];
}

export function volumeForTemperature(temperature: number): number {
  if (temperature <= MELTING_POINT) {
    return 0.82 + clamp((temperature + 20) / 20, 0, 1) * 0.04;
  }
  if (temperature < BOILING_POINT) {
    return 0.9 + (temperature / BOILING_POINT) * 0.18;
  }
  return 1.12 + clamp((temperature - BOILING_POINT) / 20, 0, 1) * 0.28;
}

export function thermalSpeed(temperature: number): number {
  return Math.sqrt((temperature + 273.15) / 293.15);
}

export function particleColor(temperature: number): string {
  const normalized = clamp(
    (temperature - MIN_TEMPERATURE) / (MAX_TEMPERATURE - MIN_TEMPERATURE),
    0,
    1,
  );
  const cold = [127, 154, 154];
  const mid = [194, 154, 112];
  const hot = [198, 107, 61];
  if (normalized < 0.5) {
    const t = normalized / 0.5;
    return rgbToHex(mix(cold, mid, t));
  }
  const t = (normalized - 0.5) / 0.5;
  return rgbToHex(mix(mid, hot, t));
}

function mix(first: number[], second: number[], t: number): number[] {
  return first.map((value, index) => Math.round(value + (second[index] - value) * t));
}

function rgbToHex(rgb: number[]): string {
  return `#${rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}
