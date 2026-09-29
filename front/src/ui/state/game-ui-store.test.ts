import type { QuizQuestion } from "@/game/types/GameDataTypes";
import { useGameUIStore } from "./game-ui-store";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

function buildQuestions(): QuizQuestion[] {
  return [
    {
      question: "Quem foi Ajuricaba?",
      options: ["A", "B", "C", "D"],
      correctOptionIndex: 2,
      explanation: "Preferiu a morte à escravização.",
    },
    {
      question: "Segunda pergunta?",
      options: ["A", "B", "C", "D"],
      correctOptionIndex: 0,
    },
  ];
}

function selectOptionIndex(index: number) {
  useGameUIStore.setState((s) => ({
    quiz: { ...s.quiz, selectedOptionIndex: index },
  }));
}

describe("game-ui-store quiz answer flow", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useGameUIStore.getState().resetQuiz();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows a retry message and keeps the player on the same question after the first wrong answer", () => {
    const onComplete = jest.fn();
    useGameUIStore.getState().startQuiz(buildQuestions(), onComplete);

    selectOptionIndex(0); // wrong (correct is 2)
    useGameUIStore.getState().selectOption();

    let quiz = useGameUIStore.getState().quiz;
    expect(quiz.wrongAttempts).toBe(1);
    expect(quiz.feedbackMessage).toBe(
      "Essa não é a resposta correta. Tente novamente.",
    );
    expect(quiz.revealedAnswer).toBe(false);
    expect(quiz.answers[0]).toBeNull();
    expect(quiz.currentQuestionIndex).toBe(0);
    expect(quiz.score).toBe(0);

    jest.advanceTimersByTime(1000);

    quiz = useGameUIStore.getState().quiz;
    expect(quiz.isProcessingAnswer).toBe(false);
    expect(quiz.selectedOptionIndex).toBeNull();
    expect(quiz.currentQuestionIndex).toBe(0);
  });

  it("shows an encouragement message on the second wrong answer and still allows a retry", () => {
    useGameUIStore.getState().startQuiz(buildQuestions(), jest.fn());

    selectOptionIndex(0);
    useGameUIStore.getState().selectOption();
    jest.advanceTimersByTime(1000);

    selectOptionIndex(1); // wrong again
    useGameUIStore.getState().selectOption();

    const quiz = useGameUIStore.getState().quiz;
    expect(quiz.wrongAttempts).toBe(2);
    expect(quiz.feedbackMessage).toBe(
      "Quase lá. Observe as informações com atenção e tente novamente.",
    );
    expect(quiz.revealedAnswer).toBe(false);
    expect(quiz.currentQuestionIndex).toBe(0);
  });

  it("reveals the correct answer and explanation after the third wrong answer without awarding credit", () => {
    useGameUIStore.getState().startQuiz(buildQuestions(), jest.fn());

    selectOptionIndex(0);
    useGameUIStore.getState().selectOption();
    jest.advanceTimersByTime(1000);

    selectOptionIndex(1);
    useGameUIStore.getState().selectOption();
    jest.advanceTimersByTime(1000);

    selectOptionIndex(3); // third wrong answer
    useGameUIStore.getState().selectOption();

    const quiz = useGameUIStore.getState().quiz;
    expect(quiz.revealedAnswer).toBe(true);
    expect(quiz.answers[0]).toBe("wrong");
    expect(quiz.score).toBe(0);
    expect(quiz.isProcessingAnswer).toBe(true);
    expect(quiz.questions[0].correctOptionIndex).toBe(2);
    expect(quiz.questions[0].explanation).toBe(
      "Preferiu a morte à escravização.",
    );
  });

  it("does not advance on its own after a reveal; continueAfterReveal moves to the next question", () => {
    useGameUIStore.getState().startQuiz(buildQuestions(), jest.fn());

    selectOptionIndex(0);
    useGameUIStore.getState().selectOption();
    jest.advanceTimersByTime(1000);
    selectOptionIndex(1);
    useGameUIStore.getState().selectOption();
    jest.advanceTimersByTime(1000);
    selectOptionIndex(3);
    useGameUIStore.getState().selectOption();

    jest.advanceTimersByTime(5000);
    expect(useGameUIStore.getState().quiz.currentQuestionIndex).toBe(0);

    useGameUIStore.getState().continueAfterReveal();

    const quiz = useGameUIStore.getState().quiz;
    expect(quiz.currentQuestionIndex).toBe(1);
    expect(quiz.wrongAttempts).toBe(0);
    expect(quiz.revealedAnswer).toBe(false);
    expect(quiz.feedbackMessage).toBeNull();
    expect(quiz.selectedOptionIndex).toBeNull();
  });

  it("awards full credit when the player gets it right on a later attempt", () => {
    const onComplete = jest.fn();
    useGameUIStore.getState().startQuiz(buildQuestions(), onComplete);

    selectOptionIndex(0); // wrong
    useGameUIStore.getState().selectOption();
    jest.advanceTimersByTime(1000);

    selectOptionIndex(2); // correct on second attempt
    useGameUIStore.getState().selectOption();

    const quiz = useGameUIStore.getState().quiz;
    expect(quiz.score).toBe(1);
    expect(quiz.answers[0]).toBe("correct");
    expect(quiz.wrongAttempts).toBe(1);
  });

  it("completes the quiz and reports the final score after a reveal on the last question", () => {
    const onComplete = jest.fn();
    useGameUIStore.getState().startQuiz(buildQuestions(), onComplete);

    // Question 1: answered correctly on the first try.
    selectOptionIndex(2);
    useGameUIStore.getState().selectOption();
    jest.advanceTimersByTime(1000);

    expect(useGameUIStore.getState().quiz.currentQuestionIndex).toBe(1);

    // Question 2: three wrong attempts, then reveal.
    selectOptionIndex(1);
    useGameUIStore.getState().selectOption();
    jest.advanceTimersByTime(1000);
    selectOptionIndex(2);
    useGameUIStore.getState().selectOption();
    jest.advanceTimersByTime(1000);
    selectOptionIndex(3);
    useGameUIStore.getState().selectOption();

    useGameUIStore.getState().continueAfterReveal();

    expect(onComplete).toHaveBeenCalledWith(1);
    const quiz = useGameUIStore.getState().quiz;
    expect(quiz.phase).toBe("performance");
    expect(quiz.isVisible).toBe(true);
  });
});

describe("game-ui-store level transition flag", () => {
  beforeEach(() => {
    useGameUIStore.setState({
      levelTransitionActive: false,
      creditsOpen: false,
      privacyOpen: false,
      gameStarted: false,
    });
  });

  /**
   * A panel left mounted over a running level holds DOM focus and swallows
   * the keys the player needs to move — the map-only UI has to die with the
   * map, whatever started the hand-off.
   */
  it("dismisses the privacy panel when a hand-off starts", () => {
    useGameUIStore.setState({ privacyOpen: true });

    useGameUIStore.getState().setLevelTransitionActive(true);

    expect(useGameUIStore.getState().levelTransitionActive).toBe(true);
    expect(useGameUIStore.getState().privacyOpen).toBe(false);
  });

  it("dismisses the credits screen when a hand-off starts", () => {
    useGameUIStore.setState({ creditsOpen: true });

    useGameUIStore.getState().setLevelTransitionActive(true);

    expect(useGameUIStore.getState().levelTransitionActive).toBe(true);
    expect(useGameUIStore.getState().creditsOpen).toBe(false);
  });

  it("leaves the credits screen alone when the flag is cleared", () => {
    useGameUIStore.setState({ creditsOpen: true, levelTransitionActive: true });

    useGameUIStore.getState().setLevelTransitionActive(false);

    expect(useGameUIStore.getState().levelTransitionActive).toBe(false);
    expect(useGameUIStore.getState().creditsOpen).toBe(true);
  });

  it("keeps the flag set through endGame, which starts a transition", () => {
    useGameUIStore.setState({ gameStarted: true, levelTransitionActive: true });

    useGameUIStore.getState().endGame();

    expect(useGameUIStore.getState().gameStarted).toBe(false);
    expect(useGameUIStore.getState().levelTransitionActive).toBe(true);
  });
});
