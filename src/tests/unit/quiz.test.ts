import { describe, expect, it } from 'vitest';
import { MOLECULES } from '../../chem/molecules';
import { buildQuiz } from '../../lib/quiz';

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

  it('produces a different sequence with a different seed', () => {
    const first = buildQuiz(MOLECULES, 1, 5);
    const second = buildQuiz(MOLECULES, 2, 5);
    expect(first.map((question) => question.moleculeId)).not.toEqual(
      second.map((question) => question.moleculeId),
    );
  });
});
