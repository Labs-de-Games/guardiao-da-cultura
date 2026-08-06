import { render, screen } from "@testing-library/react";
import type { QuizQuestion } from "@/game/types/GameDataTypes";
import { useGameUIStore } from "../state/game-ui-store";
import QuizPanel from "./Quiz";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

function buildQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    question: "Qual material Edgard de Souza usou nessas esculturas?",
    options: ["Argila", "Mármore", "Bronze", "Madeira"],
    correctOptionIndex: 2,
    ...overrides,
  };
}

describe("QuizPanel reveal feedback", () => {
  beforeEach(() => {
    useGameUIStore.getState().resetQuiz();
  });

  it("shows the question's explanation once the correct answer is revealed", () => {
    useGameUIStore.getState().startQuiz(
      [
        buildQuestion({
          explanation: "As esculturas foram fundidas em bronze.",
        }),
      ],
      jest.fn(),
    );

    useGameUIStore.setState((s) => ({
      quiz: {
        ...s.quiz,
        selectedOptionIndex: 0,
        wrongAttempts: 3,
        revealedAnswer: true,
        isProcessingAnswer: true,
        answers: ["wrong"],
      },
    }));

    render(<QuizPanel />);

    expect(
      screen.getByText("As esculturas foram fundidas em bronze."),
    ).toBeInTheDocument();
  });

  it("does not render an explanation block when the question has none", () => {
    useGameUIStore.getState().startQuiz([buildQuestion()], jest.fn());

    useGameUIStore.setState((s) => ({
      quiz: {
        ...s.quiz,
        selectedOptionIndex: 0,
        wrongAttempts: 3,
        revealedAnswer: true,
        isProcessingAnswer: true,
        answers: ["wrong"],
      },
    }));

    render(<QuizPanel />);

    expect(screen.queryByText(/fundidas em bronze/)).not.toBeInTheDocument();
  });
});
