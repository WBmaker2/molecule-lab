import type { MoleculeData } from '../chem/types';

export interface QuizOption {
  id: string;
  nameKo: string;
}

export interface QuizQuestion {
  moleculeId: string;
  answerId: string;
  options: QuizOption[];
}

export function buildQuiz(molecules: MoleculeData[], seed = 2026, length = 5): QuizQuestion[] {
  const random = mulberry32(seed);
  const pool = shuffle([...molecules], random);
  const selected = pool.slice(0, Math.min(length, pool.length));
  return selected.map((molecule) => {
    const distractors = shuffle(
      molecules.filter((candidate) => candidate.id !== molecule.id),
      random,
    ).slice(0, 3);
    const options = shuffle(
      [molecule, ...distractors].map((candidate) => ({
        id: candidate.id,
        nameKo: candidate.nameKo,
      })),
      random,
    );
    return {
      moleculeId: molecule.id,
      answerId: molecule.id,
      options,
    };
  });
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const array = [...items];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [array[index], array[target]] = [array[target], array[index]];
  }
  return array;
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
