import ionsJson from './ions.json';
import type { IonData } from './types';

export const IONS = ionsJson as IonData[];

export const ION_BY_ID: Record<string, IonData> = Object.fromEntries(
  IONS.map((ion) => [ion.id, ion]),
);

export const ION_GROUPS = ['전체', '양이온', '음이온'] as const;

export function getIon(id: string): IonData {
  return ION_BY_ID[id] ?? IONS[0];
}

export function ionKindKo(kind: IonData['kind']): string {
  return kind === 'cation' ? '양이온' : '음이온';
}
