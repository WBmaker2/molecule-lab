export type ElementSymbol = 'H' | 'C' | 'N' | 'O' | 'Na' | 'Cl' | 'S' | 'Ag';

export type Vec3 = [number, number, number];

export interface ElementInfo {
  symbol: ElementSymbol;
  nameKo: string;
  nameEn: string;
  atomicNumber: number;
  color: string;
  deepColor: string;
  radius: number;
  covalentRadius: number;
  valence: number;
  electronegativity: number;
  categoryKo: string;
  palette: boolean;
  blurbKo: string;
}

export interface Atom {
  id: string;
  element: ElementSymbol;
  position: Vec3;
  targetIndex?: number;
}

export interface Bond {
  id: string;
  a: string;
  b: string;
  order: 1 | 2 | 3;
  ionic?: boolean;
}

export interface MoleculeAtomData {
  element: ElementSymbol;
  position: Vec3;
}

export interface MoleculeBondData {
  a: number;
  b: number;
  order: 1 | 2 | 3;
  ionic?: boolean;
}

export interface MoleculeData {
  id: string;
  formula: string;
  nameKo: string;
  nameEn: string;
  category: string;
  atoms: MoleculeAtomData[];
  bonds: MoleculeBondData[];
  shapeKo: string;
  polarityKo: string;
  angleKo: string;
  descriptionKo: string;
  factKo: string;
  accent: string;
}

export interface ReactionActor {
  id: string;
  label: string;
  color: string;
  radius: number;
  keyframes: { t: number; pos: Vec3 }[];
  fadeOut?: [number, number];
}

export interface ReactionStep {
  at: number;
  titleKo: string;
  detailKo: string;
}

export interface ReactionData {
  id: string;
  titleKo: string;
  subtitleKo: string;
  equation: string;
  observationKo: string;
  sceneKo: string;
  duration: number;
  accent: string;
  steps: ReactionStep[];
  actors: ReactionActor[];
  products?: {
    label: string;
    color: string;
    keyframes: { t: number; pos: Vec3 }[];
    appear?: [number, number];
  }[];
  precipitate?: {
    from: Vec3;
    color: string;
    count: number;
    startT: number;
    endT: number;
    settleY: number;
  };
}

export type Phase = 'solid' | 'liquid' | 'gas';
