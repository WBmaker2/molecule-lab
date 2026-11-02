import { IONS } from './ions';
import { MOLECULES, MOLECULE_BY_ID } from './molecules';
import { REACTIONS, REACTION_BY_ID } from './reactions';
import type { IonData, MoleculeData, ReactionData } from './types';

export const CONTENT_VERSION = '2026.11.03';

export function validateMoleculeData(molecule: MoleculeData): string[] {
  const errors: string[] = [];
  if (!molecule.id) errors.push('분자 id가 없습니다.');
  if (!molecule.formula) errors.push(`${molecule.id || '?'}: 화학식이 없습니다.`);
  if (molecule.atoms.length === 0) errors.push(`${molecule.id}: 원자가 없습니다.`);
  if (molecule.bonds.length === 0) errors.push(`${molecule.id}: 결합이 없습니다.`);
  molecule.bonds.forEach((bond, index) => {
    if (!molecule.atoms[bond.a] || !molecule.atoms[bond.b]) {
      errors.push(`${molecule.id}: ${index}번 결합이 존재하지 않는 원자를 가리킵니다.`);
    }
    if (bond.a === bond.b) errors.push(`${molecule.id}: ${index}번 결합의 양 끝이 같습니다.`);
    if (bond.order !== 1 && bond.order !== 2 && bond.order !== 3) {
      errors.push(`${molecule.id}: ${index}번 결합 차수가 올바르지 않습니다.`);
    }
  });
  if (!molecule.nameKo) errors.push(`${molecule.id}: 이름이 없습니다.`);
  for (const field of ['shapeKo', 'polarityKo', 'angleKo', 'descriptionKo', 'factKo'] as const) {
    if (!molecule[field] || molecule[field].length < 2) {
      errors.push(`${molecule.id}: ${field} 설명이 부족합니다.`);
    }
  }
  return errors;
}

export function validateReactionData(reaction: ReactionData): string[] {
  const errors: string[] = [];
  if (!reaction.id) errors.push('반응 id가 없습니다.');
  if (!reaction.equation.includes('→')) errors.push(`${reaction.id}: 반응식이 올바르지 않습니다.`);
  if (!reaction.netIonicEquation.includes('→')) {
    errors.push(`${reaction.id}: 알짜 이온식이 올바르지 않습니다.`);
  }
  if (reaction.steps.length < 3) errors.push(`${reaction.id}: 단계가 3개 미만입니다.`);
  const times = reaction.steps.map((step) => step.at);
  for (let index = 1; index < times.length; index += 1) {
    if (times[index] <= times[index - 1]) errors.push(`${reaction.id}: 단계 시간이 순서대로가 아닙니다.`);
  }
  if (times[0] !== 0) errors.push(`${reaction.id}: 첫 단계가 0에서 시작하지 않습니다.`);
  if (reaction.actors.length < 4) errors.push(`${reaction.id}: 이온이 4개 미만입니다.`);
  for (const actor of reaction.actors) {
    if (actor.keyframes.length === 0) errors.push(`${reaction.id}: ${actor.id} 이동 경로가 없습니다.`);
    for (const frame of actor.keyframes) {
      if (!frame.pos.every((value) => Number.isFinite(value))) {
        errors.push(`${reaction.id}: ${actor.id} 좌표에 숫자가 아닌 값이 있습니다.`);
      }
    }
  }
  if (reaction.duration <= 0) errors.push(`${reaction.id}: 재생 시간이 올바르지 않습니다.`);
  return errors;
}

export function validateIonData(ion: IonData): string[] {
  const errors: string[] = [];
  if (!ion.id) errors.push('이온 id가 없습니다.');
  if (!ion.formula) errors.push(`${ion.id || '?'}: 화학식이 없습니다.`);
  if (ion.charge === 0) errors.push(`${ion.id}: 전하가 0입니다.`);
  if (ion.kind !== 'cation' && ion.kind !== 'anion') {
    errors.push(`${ion.id}: 양이온/음이온 구분이 올바르지 않습니다.`);
  }
  if (!ion.descriptionKo || ion.descriptionKo.length < 10) {
    errors.push(`${ion.id}: 설명이 부족합니다.`);
  }
  if (!ion.solubilityKo || ion.solubilityKo.length < 5) {
    errors.push(`${ion.id}: 용해도 설명이 부족합니다.`);
  }
  for (const reactionId of ion.reactionIds) {
    if (!(reactionId in REACTION_BY_ID)) {
      errors.push(`${ion.id}: 존재하지 않는 반응 ${reactionId}을 가리킵니다.`);
    }
  }
  return errors;
}

export function validateContent(): string[] {
  const errors: string[] = [];
  if (MOLECULES.length !== 12) errors.push(`분자 도감은 12종이어야 합니다. 현재 ${MOLECULES.length}종`);
  if (new Set(MOLECULES.map((molecule) => molecule.id)).size !== MOLECULES.length) {
    errors.push('분자 id가 중복되었습니다.');
  }
  for (const molecule of MOLECULES) errors.push(...validateMoleculeData(molecule));
  if (REACTIONS.length !== 4) errors.push(`반응 극장은 4장면이어야 합니다. 현재 ${REACTIONS.length}장면`);
  for (const reaction of REACTIONS) errors.push(...validateReactionData(reaction));
  if (IONS.length !== 11) errors.push(`이온 도감은 11종이어야 합니다. 현재 ${IONS.length}종`);
  for (const ion of IONS) errors.push(...validateIonData(ion));
  for (const moleculeId of Object.keys(MOLECULE_BY_ID)) {
    if (!MOLECULES.some((molecule) => molecule.id === moleculeId)) {
      errors.push(`분자 색인에 없는 분자가 있습니다: ${moleculeId}`);
    }
  }
  return errors;
}
