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

export function similarityScore(first: MoleculeData, second: MoleculeData): number {
  let score = 0;
  if (first.shapeKo === second.shapeKo) score += 3;
  if (first.polarityKo === second.polarityKo) score += 2;
  if (first.category === second.category) score += 1;
  if (first.atoms.length === second.atoms.length) score += 1;
  if (first.bonds.length === second.bonds.length) score += 1;
  return score;
}

export function buildQuiz(
  molecules: MoleculeData[],
  seed = 2026,
  length = 5,
  options: { distractorOrder?: 'similar' | 'random' } = {},
): QuizQuestion[] {
  const random = mulberry32(seed);
  const pool = shuffle([...molecules], random);
  const selected = pool.slice(0, Math.min(length, pool.length));
  const distractorOrder = options.distractorOrder ?? 'similar';
  return selected.map((molecule) => {
    const candidates = molecules.filter((candidate) => candidate.id !== molecule.id);
    const ranked =
      distractorOrder === 'similar'
        ? [...candidates]
            .map((candidate, index) => ({
              candidate,
              score: similarityScore(molecule, candidate),
              tiebreak: mulberry32(seed * 31 + index * 101 + molecule.id.length)(),
            }))
            .sort((first, second) => second.score - first.score || first.tiebreak - second.tiebreak)
            .map((entry) => entry.candidate)
        : shuffle(candidates, random);
    const distractors = ranked.slice(0, 3);
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
