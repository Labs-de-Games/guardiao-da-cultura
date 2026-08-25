import { fireEvent, render, screen } from "@testing-library/react";
import type { QuizQuestion } from "@/game/types/GameDataTypes";
import { EventBus } from "@/shared/events/event-bus";
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

function buildFiveQuestions(): QuizQuestion[] {
  return Array.from({ length: 5 }, (_, i) =>
    buildQuestion({ question: `Pergunta ${i + 1}?` }),
  );
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

describe("QuizPanel performance phase", () => {
  beforeEach(() => {
    useGameUIStore.getState().resetQuiz();
  });

  function setupPerformancePhase(score: number, isIntermediate = false) {
    const questions = buildFiveQuestions();
    useGameUIStore.getState().startQuiz(questions, jest.fn(), isIntermediate);
    useGameUIStore.setState((s) => ({
      quiz: {
        ...s.quiz,
        phase: "performance",
        score,
        answers: questions.map((_, i) => (i < score ? "correct" : "wrong")),
      },
    }));
  }

  it("shows 'Proxima fase' when score passes threshold", () => {
    setupPerformancePhase(3);
    render(<QuizPanel />);
    expect(screen.getByText(/Próxima fase/)).toBeInTheDocument();
  });

  it("shows 'Tentar novamente' when score fails threshold", () => {
    setupPerformancePhase(2);
    render(<QuizPanel />);
    expect(screen.getByText(/Tentar novamente/)).toBeInTheDocument();
  });

  it("shows 'Parabens' title on passing score", () => {
    setupPerformancePhase(3);
    render(<QuizPanel />);
    expect(screen.getAllByText("Parabéns!").length).toBeGreaterThanOrEqual(1);
  });

  it("shows score-based message on failing score", () => {
    setupPerformancePhase(2);
    render(<QuizPanel />);
    expect(
      screen.getByText("Com mais atenção, você consegue!"),
    ).toBeInTheDocument();
  });

  it("asks for the next level when 'Proxima fase' is clicked", () => {
    const emit = jest.spyOn(EventBus, "emit");
    setupPerformancePhase(3);
    render(<QuizPanel />);

    fireEvent.click(screen.getByText(/Próxima fase/));

    expect(emit).toHaveBeenCalledWith("quiz:next-level", undefined);
    emit.mockRestore();
  });

  it("retries instead of advancing when the score failed", () => {
    const emit = jest.spyOn(EventBus, "emit");
    setupPerformancePhase(2);
    render(<QuizPanel />);

    fireEvent.click(screen.getByText(/Tentar novamente/));

    expect(emit).toHaveBeenCalledWith("quiz:retry", undefined);
    expect(emit).not.toHaveBeenCalledWith("quiz:next-level", undefined);
    emit.mockRestore();
  });
});

describe("QuizPanel intermediate mode", () => {
  beforeEach(() => {
    useGameUIStore.getState().resetQuiz();
  });

  it("shows 'Boa pontuacao' subtitle when intermediate score passes", () => {
    const questions = buildFiveQuestions();
    useGameUIStore.getState().startQuiz(questions, jest.fn(), true);
    useGameUIStore.setState((s) => ({
      quiz: {
        ...s.quiz,
        phase: "performance",
        score: 3,
        answers: ["correct", "correct", "correct", "wrong", "wrong"],
      },
    }));
    render(<QuizPanel />);
    expect(screen.getByText("Boa pontuação")).toBeInTheDocument();
  });
});

describe("QuizPanel questioning phase", () => {
  beforeEach(() => {
    useGameUIStore.getState().resetQuiz();
  });

  it("shows question counter as current/total", () => {
    const questions = buildFiveQuestions();
    useGameUIStore.getState().startQuiz(questions, jest.fn());
    render(<QuizPanel />);
    expect(screen.getByText("Pergunta 1/5")).toBeInTheDocument();
  });
});
