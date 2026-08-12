import type { QuizQuestion } from "../types/GameDataTypes";
import { prepareQuizQuestions } from "./shuffleQuiz";

function makeQuestion(correctText: string, id?: string): QuizQuestion {
  const allOptions = ["Correct", "Wrong A", "Wrong B", "Wrong C"];
  const options = [correctText, ...allOptions.filter((o) => o !== correctText)];
  return {
    question: id ?? `q-${correctText}`,
    options,
    explanation: `Explanation for ${correctText}`,
  };
}

function findByQuestion(
  result: QuizQuestion[],
  questionText: string,
): QuizQuestion {
  return result.find((q) => q.question === questionText)!;
}

describe("prepareQuizQuestions", () => {
  it("preserves correct answer identity after shuffle", () => {
    const questions = [
      makeQuestion("Alpha", "q-alpha"),
      makeQuestion("Beta", "q-beta"),
      makeQuestion("Gamma", "q-gamma"),
    ];

    const result = prepareQuizQuestions(questions);

    for (const q of questions) {
      const shuffled = findByQuestion(result, q.question);
      expect(shuffled.correctOptionIndex).toBeDefined();
      expect(typeof shuffled.correctOptionIndex).toBe("number");
      expect(shuffled.options[shuffled.correctOptionIndex!]).toBe(q.options[0]);
    }
  });

  it("correctOptionIndex points to the original correct text", () => {
    const questions = [
      makeQuestion("Answer1", "q1"),
      makeQuestion("Answer2", "q2"),
    ];

    for (let run = 0; run < 20; run++) {
      const result = prepareQuizQuestions(questions);
      for (const q of questions) {
        const shuffled = findByQuestion(result, q.question);
        const correctIdx = shuffled.correctOptionIndex!;
        expect(shuffled.options[correctIdx]).toBe(q.options[0]);
      }
    }
  });

  it("does not mutate source array", () => {
    const q1 = makeQuestion("A");
    const q2 = makeQuestion("B");
    const original = [q1, q2];
    const originalQuestions = [...original];

    prepareQuizQuestions(original);

    expect(original).toEqual(originalQuestions);
    expect(original[0]).toBe(q1);
    expect(original[1]).toBe(q2);
  });

  it("does not mutate source question options", () => {
    const q = makeQuestion("Correct");
    const originalOptions = [...q.options];

    prepareQuizQuestions([q]);

    expect(q.options).toEqual(originalOptions);
  });

  it("returns same number of questions", () => {
    const questions = [makeQuestion("A"), makeQuestion("B"), makeQuestion("C")];

    const result = prepareQuizQuestions(questions);
    expect(result).toHaveLength(3);
  });

  it("preserves all options per question", () => {
    const questions = [makeQuestion("Correct")];

    const result = prepareQuizQuestions(questions);
    const originalOptions = questions[0].options;

    expect(result[0].options.sort()).toEqual(originalOptions.sort());
  });

  it("handles single question", () => {
    const questions = [makeQuestion("Only")];

    const result = prepareQuizQuestions(questions);
    expect(result).toHaveLength(1);
    expect(result[0].correctOptionIndex).toBeGreaterThanOrEqual(0);
    expect(result[0].correctOptionIndex).toBeLessThan(result[0].options.length);
    expect(result[0].options[result[0].correctOptionIndex!]).toBe("Only");
  });

  it("handles empty array", () => {
    const result = prepareQuizQuestions([]);
    expect(result).toEqual([]);
  });

  it("preserves question metadata (explanation, question text)", () => {
    const q: QuizQuestion = {
      question: "What is 2+2?",
      options: ["4", "3", "5", "6"],
      explanation: "Basic math",
    };

    const result = prepareQuizQuestions([q]);
    expect(result[0].question).toBe("What is 2+2?");
    expect(result[0].explanation).toBe("Basic math");
  });

  it("produces valid correctOptionIndex across many runs", () => {
    const questions = [
      makeQuestion("First", "q-first"),
      makeQuestion("Second", "q-second"),
      makeQuestion("Third", "q-third"),
      makeQuestion("Fourth", "q-fourth"),
    ];

    for (let run = 0; run < 50; run++) {
      const result = prepareQuizQuestions(questions);
      for (const q of questions) {
        const shuffled = findByQuestion(result, q.question);
        const idx = shuffled.correctOptionIndex!;
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(shuffled.options.length);
        expect(shuffled.options[idx]).toBe(q.options[0]);
      }
    }
  });
});
