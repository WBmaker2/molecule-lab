import { describe, expect, it } from 'vitest';
import { MOLECULES } from '../../chem/molecules';
import { buildQuiz, similarityScore } from '../../lib/quiz';
import { quizScore, useQuizStore } from '../../stores/quizStore';

describe('molecule quiz generation', () => {
  it('builds a deterministic five-question quiz with four unique options each', () => {
    const first = buildQuiz(MOLECULES, 2026, 5);
    const second = buildQuiz(MOLECULES, 2026, 5);
    expect(first).toHaveLength(5);
    expect(first).toEqual(second);
    expect(new Set(first.map((question) => question.moleculeId)).size).toBe(5);
    for (const question of first) {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options.map((option) => option.id)).size).toBe(4);
      expect(question.options.some((option) => option.id === question.answerId)).toBe(true);
    }
  });

  it('prefers structurally similar distractors for bent polar molecules', () => {
    const water = MOLECULES.find((molecule) => molecule.id === 'h2o');
    const sulfide = MOLECULES.find((molecule) => molecule.id === 'h2s');
    const methane = MOLECULES.find((molecule) => molecule.id === 'ch4');
    expect(water && sulfide && methane).toBeTruthy();
    if (!water || !sulfide || !methane) return;
    expect(similarityScore(water, sulfide)).toBeGreaterThan(similarityScore(water, methane));
    const questions = buildQuiz([water, sulfide, methane], 2026, 3, {
      distractorOrder: 'similar',
    });
    const question = questions.find((entry) => entry.moleculeId === 'h2o');
    expect(question?.options.map((option) => option.id)).toContain('h2s');
  });

  it('tracks quiz score and session progress without storage', () => {
    expect(quizScore([true, false, true])).toBe(2);
    useQuizStore.getState().start(7, 5);
    useQuizStore.getState().choose('h2o', 'h2o', 'h2o');
    expect(useQuizStore.getState().results).toEqual([true]);
    expect(useQuizStore.getState().history.h2o.asked).toBe(1);
  });

  it('produces a different sequence with a different seed', () => {
    const first = buildQuiz(MOLECULES, 1, 5);
    const second = buildQuiz(MOLECULES, 2, 5);
    expect(first.map((question) => question.moleculeId)).not.toEqual(
      second.map((question) => question.moleculeId),
    );
  });
});
