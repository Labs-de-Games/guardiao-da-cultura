import type { QuizQuestion } from "../types/GameDataTypes";

function shuffleArray<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Prepares quiz questions for display by shuffling both question order
 * and answer options within each question. The first item in the source
 * `options` array is always the correct answer (authoring convention).
 *
 * Returns a new array — source data is never mutated.
 */
export function prepareQuizQuestions(
  questions: readonly QuizQuestion[],
): QuizQuestion[] {
  const shuffledQuestions = shuffleArray(questions);

  return shuffledQuestions.map((q) => {
    const correctText = q.options[0];
    const shuffledOptions = shuffleArray(q.options);
    const newCorrectIndex = shuffledOptions.indexOf(correctText);

    return {
      ...q,
      options: shuffledOptions,
      correctOptionIndex: newCorrectIndex,
    };
  });
}
