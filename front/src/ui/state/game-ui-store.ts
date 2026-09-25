import posthog from "posthog-js";
import { create } from "zustand";
import type { UserProgressState } from "@/game/types/ProgressionTypes";
import { DEFAULT_MAP_MARKER } from "../../game/constants/MapMarkers";
import type { BadgeConfig } from "../../lib/badgesApi";
import { fetchBadges, fetchUserBadges } from "../../lib/badgesApi";
import { getGuestBadgeIds } from "../../lib/badgesStorage";

let loadGeneration = 0;

export { useDialogueStore } from "./dialogue-store";

const MAX_VISIBLE_TOASTS = 5;
const MIN_TOAST_DURATION = 1000;
const MAX_TOAST_DURATION = 10000;
const MAX_QUIZ_ATTEMPTS = 3;
const QUIZ_RETRY_MESSAGES = [
  "Essa não é a resposta correta. Tente novamente.",
  "Quase lá. Observe as informações com atenção e tente novamente.",
];

export interface ToastEntry {
  id: string;
  message: string;
  duration: number;
  iconSrc?: string;
  exiting: boolean;
}

import type {
  LabelInfoData,
  MapMarkerChangedData,
} from "@/shared/events/game-events";
import type { IntroConfig } from "@/ui/intro/types";

export const UI_Z_INDEX = {
  OVERLAY: 10,
} as const;

export interface QuestStep {
  text: string;
  infoKey?: string;
  done: boolean;
  filled?: number;
  total?: number;
}

export interface MissionProgress {
  missionId: string;
  title: string;
  steps: QuestStep[];
}

export interface BoardPosition {
  position: { x: number; y: number; rotation: number };
  connectedTo: string[];
}

export interface CollectibleEntry {
  id: string;
  name: string;
  collected: boolean;
  category: string;
  board?: BoardPosition;
  educational?: { description: string; medium?: string; opinion?: string };
  metadata?: { title: string; author?: string; year?: string; place?: string };
}

export interface ChunkSelectorData {
  instanceId: string;
  availableItems: { id: string; name: string; levelId: string }[];
  filledSlots: (string | null)[];
  expectedSlots: string[];
}

export interface CostumeSelectorData {
  instanceId: string;
  correctCostume: string;
  equippedParts: {
    head: string | null;
    torso: string | null;
    feet: string | null;
  };
  lockedParts: { head: boolean; torso: boolean; feet: boolean };
}

export interface BandPanelData {
  instanceId: string;
  id: string;
  options: string[];
}

import type { GeniusSequenceOpenData } from "@/shared/events/game-events";
import type { QuizQuestion } from "../../game/types/GameDataTypes";
import type { StepSequenceData } from "../panels/step-sequence-types";

export interface GameUIState {
  sidebarOpen: boolean;
  controlsOpen: boolean;
  gameStarted: boolean;
  /** True from the moment any hand-off into a level starts until the map is re-entered. */
  levelTransitionActive: boolean;
  activeMapMarker: MapMarkerChangedData | null;
  levelInfo: { title: string; location: string; shortlocation: string } | null;
  autoStartProgress: number | null;
  stars: number;
  totalStars: number;
  score: number;
  missions: MissionProgress[];
  collectibles: CollectibleEntry[];
  chunkSelectorOpen: boolean;
  chunkSelectorData: ChunkSelectorData | null;
  costumeSelectorOpen: boolean;
  costumeSelectorData: CostumeSelectorData | null;
  stepSequenceOpen: boolean;
  stepSequenceData: StepSequenceData | null;
  bandPanelOpen: boolean;
  bandPanelData: BandPanelData | null;
  geniusSequenceOpen: boolean;
  geniusSequenceData: GeniusSequenceOpenData | null;
  toasts: ToastEntry[];
  labelData: LabelInfoData | null;
  badgeGalleryOpen: boolean;
  badges: BadgeConfig[];
  unlockedBadgeIds: string[];
  badgeError: string | null;
  isAuthenticated: boolean;
  guestId: string | null;
  isInterestDialogOpen: boolean;
  progression: UserProgressState | null;
  introData: { levelId: string; config: IntroConfig } | null;
  evidenceBoardOpen: boolean;
  evidenceBoardSelectedClueId: string | null;
  creditsOpen: boolean;

  quiz: {
    isVisible: boolean;
    phase: "questioning" | "performance";
    questions: QuizQuestion[];
    currentQuestionIndex: number;
    selectedOptionIndex: number | null;
    answers: ("correct" | "wrong" | null)[];
    score: number;
    isProcessingAnswer: boolean;
    isIntermediate: boolean;
    quizNumber: number | null;
    attemptNumber: number;
    onComplete: ((score: number) => void) | null;
    wrongAttempts: number;
    attemptFeedback: "correct" | "wrong" | null;
    feedbackMessage: string | null;
    revealedAnswer: boolean;
  };

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setControlsOpen: (open: boolean) => void;
  setGameStarted: (started: boolean) => void;
  setLevelTransitionActive: (active: boolean) => void;
  startGame: () => void;
  endGame: () => void;
  setActiveMapMarker: (marker: MapMarkerChangedData | null) => void;
  setLevelInfo: (
    info: { title: string; location: string; shortlocation: string } | null,
  ) => void;
  setAutoStartProgress: (progress: number | null) => void;
  setStars: (current: number, total: number) => void;
  setScore: (score: number) => void;
  setMissions: (missions: MissionProgress[]) => void;
  addOrUpdateMission: (
    missionId: string,
    title: string,
    collectedInfos: string[],
    totalSteps: number,
    steps?: { infoKey: string; text: string }[],
    stepProgress?: { filled: number; total: number }[],
  ) => void;
  updateMissionStep: (
    missionId: string,
    stepIndex: number,
    done: boolean,
  ) => void;
  setCollectibles: (entries: CollectibleEntry[]) => void;
  collectItem: (itemId: string) => void;
  openChunkSelector: (data: ChunkSelectorData) => void;
  closeChunkSelector: () => void;
  openCostumeSelector: (data: CostumeSelectorData) => void;
  closeCostumeSelector: () => void;
  openStepSequence: (data: StepSequenceData) => void;
  closeStepSequence: () => void;
  openBandPanel: (data: BandPanelData) => void;
  closeBandPanel: () => void;
  openGeniusSequence: (data: GeniusSequenceOpenData) => void;
  closeGeniusSequence: () => void;
  addToast: (message: string, duration: number, iconSrc?: string) => void;
  dismissToast: (id: string) => void;
  removeToast: (id: string) => void;
  setLabelData: (data: LabelInfoData | null) => void;
  setAuthState: (isAuthenticated: boolean, guestId: string | null) => void;
  setBadgeGalleryOpen: (open: boolean) => void;
  setBadgeData: (badges: BadgeConfig[], unlockedIds: string[]) => void;
  loadBadgeData: () => Promise<void>;
  addUnlockedBadge: (badgeId: string) => void;
  openInterestDialog: () => void;
  closeInterestDialog: () => void;
  setProgression: (state: UserProgressState) => void;
  setIntroData: (data: { levelId: string; config: IntroConfig } | null) => void;
  setEvidenceBoardOpen: (open: boolean) => void;
  setEvidenceBoardSelectedClueId: (id: string | null) => void;
  setCreditsOpen: (open: boolean) => void;

  startQuiz: (
    questions: QuizQuestion[],
    onComplete: (score: number) => void,
    isIntermediate?: boolean,
    quizNumber?: number | null,
    attemptNumber?: number,
  ) => void;
  selectOption: () => void;
  continueAfterReveal: () => void;
  moveSelection: (dRow: number, dCol: number) => void;
  nextQuestion: () => void;
  retryQuiz: () => void;
  closeQuiz: () => void;
  resetQuiz: () => void;
}

export const useGameUIStore = create<GameUIState>()((set, get) => {
  const advanceQuiz = () => {
    const state = get();
    const nextIndex = state.quiz.currentQuestionIndex + 1;

    if (nextIndex < state.quiz.questions.length) {
      set((s) => ({
        quiz: {
          ...s.quiz,
          currentQuestionIndex: nextIndex,
          selectedOptionIndex: null,
          isProcessingAnswer: false,
          wrongAttempts: 0,
          attemptFeedback: null,
          feedbackMessage: null,
          revealedAnswer: false,
        },
      }));
      return;
    }

    const finalScore = state.quiz.score;
    const onComplete = state.quiz.onComplete;

    if (state.quiz.isIntermediate) {
      if (onComplete) {
        onComplete(finalScore);
      }
      set((s) => ({
        quiz: {
          ...s.quiz,
          isProcessingAnswer: false,
          isVisible: false,
          phase: "questioning",
          isIntermediate: false,
          wrongAttempts: 0,
          attemptFeedback: null,
          feedbackMessage: null,
          revealedAnswer: false,
        },
      }));
    } else {
      set((s) => ({
        quiz: {
          ...s.quiz,
          phase: "performance",
          isProcessingAnswer: false,
          attemptFeedback: null,
          feedbackMessage: null,
          revealedAnswer: false,
        },
      }));

      if (onComplete) {
        onComplete(finalScore);
      }
    }
  };

  return {
    sidebarOpen: false,
    controlsOpen: false,
    gameStarted: false,
    levelTransitionActive: false,
    activeMapMarker: DEFAULT_MAP_MARKER,
    levelInfo: null,
    autoStartProgress: null,
    stars: 0,
    totalStars: 0,
    score: 0,
    missions: [],
    collectibles: [],
    chunkSelectorOpen: false,
    chunkSelectorData: null,
    costumeSelectorOpen: false,
    costumeSelectorData: null,
    stepSequenceOpen: false,
    stepSequenceData: null,
    bandPanelOpen: false,
    bandPanelData: null,
    geniusSequenceOpen: false,
    geniusSequenceData: null,
    toasts: [],
    labelData: null,
    badgeGalleryOpen: false,
    badges: [],
    unlockedBadgeIds: [],
    badgeError: null,
    isAuthenticated: false,
    guestId: null,
    isInterestDialogOpen: false,
    progression: null,
    introData: null,
    evidenceBoardOpen: false,
    evidenceBoardSelectedClueId: null,
    creditsOpen: false,

    quiz: {
      isVisible: false,
      phase: "questioning",
      questions: [],
      currentQuestionIndex: 0,
      selectedOptionIndex: 0,
      answers: [],
      score: 0,
      isProcessingAnswer: false,
      isIntermediate: false,
      quizNumber: null,
      attemptNumber: 1,
      onComplete: null,
      wrongAttempts: 0,
      attemptFeedback: null,
      feedbackMessage: null,
      revealedAnswer: false,
    },

    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    setControlsOpen: (open) => set({ controlsOpen: open }),
    setGameStarted: (started) => set({ gameStarted: started }),
    setLevelTransitionActive: (active) =>
      set(
        active
          ? // The hand-off owns the screen: dismiss the credits crawl along
            // with the rest of the map-only UI so it cannot outlive the map.
            { levelTransitionActive: true, creditsOpen: false }
          : { levelTransitionActive: false },
      ),
    startGame: () => {
      const { gameStarted } = get();
      if (!gameStarted) {
        set({ gameStarted: true });
      }
    },
    endGame: () => {
      const { gameStarted } = get();
      if (gameStarted) {
        // When leaving a level, ensure no level-scoped UI leaks
        // into the next level load (missions, collectibles, panels).
        set({
          // levelTransitionActive is deliberately left alone: endGame() marks
          // the *start* of leaving a level, not the end of a transition. Only
          // MapIntroScene.create() clears it, when the player is back on the map.
          gameStarted: false,
          sidebarOpen: false,
          controlsOpen: false,
          score: 0,
          missions: [],
          collectibles: [],
          chunkSelectorOpen: false,
          chunkSelectorData: null,
          stepSequenceOpen: false,
          stepSequenceData: null,
          bandPanelOpen: false,
          bandPanelData: null,
          geniusSequenceOpen: false,
          geniusSequenceData: null,
          labelData: null,
          levelInfo: null,
          evidenceBoardOpen: false,
          evidenceBoardSelectedClueId: null,
        });
      }
    },
    setActiveMapMarker: (marker) => set({ activeMapMarker: marker }),
    setLevelInfo: (info) => set({ levelInfo: info }),
    setAutoStartProgress: (progress) => set({ autoStartProgress: progress }),
    setStars: (current, total) => set({ stars: current, totalStars: total }),
    setScore: (score) => set({ score }),
    setMissions: (missions) => set({ missions }),
    addOrUpdateMission: (
      missionId,
      title,
      collectedInfos,
      totalSteps,
      steps,
      stepProgress,
    ) =>
      set((s) => {
        const progress = stepProgress ?? [];
        const buildSteps = (_existing?: MissionProgress) =>
          Array.from({ length: totalSteps }, (_, i) => ({
            text:
              steps?.[i]?.text || _existing?.steps[i]?.text || `Etapa ${i + 1}`,
            infoKey: steps?.[i]?.infoKey,
            done: steps?.[i]?.infoKey
              ? collectedInfos.includes(steps[i]?.infoKey ?? "")
              : false,
            filled: progress[i]?.filled,
            total: progress[i]?.total,
          }));

        const existing = s.missions.find((m) => m.missionId === missionId);
        if (existing) {
          return {
            missions: s.missions.map((m) =>
              m.missionId === missionId ? { ...m, steps: buildSteps(m) } : m,
            ),
          };
        }
        return {
          missions: [...s.missions, { missionId, title, steps: buildSteps() }],
        };
      }),
    updateMissionStep: (missionId, stepIndex, done) =>
      set((s) => ({
        missions: s.missions.map((m) =>
          m.missionId === missionId
            ? {
                ...m,
                steps: m.steps.map((step, i) =>
                  i === stepIndex ? { ...step, done } : step,
                ),
              }
            : m,
        ),
      })),
    setCollectibles: (collectibles) => set({ collectibles }),
    collectItem: (itemId) =>
      set((s) => ({
        collectibles: s.collectibles.map((c) =>
          c.id === itemId ? { ...c, collected: true } : c,
        ),
      })),
    openChunkSelector: (data) =>
      set({
        chunkSelectorOpen: true,
        chunkSelectorData: data,
      }),
    closeChunkSelector: () =>
      set({
        chunkSelectorOpen: false,
        chunkSelectorData: null,
      }),
    openCostumeSelector: (data) =>
      set({
        costumeSelectorOpen: true,
        costumeSelectorData: data,
      }),
    closeCostumeSelector: () =>
      set({
        costumeSelectorOpen: false,
        costumeSelectorData: null,
      }),
    openStepSequence: (data) =>
      set({
        stepSequenceOpen: true,
        stepSequenceData: data,
      }),
    closeStepSequence: () =>
      set({
        stepSequenceOpen: false,
        stepSequenceData: null,
      }),
    openBandPanel: (data) =>
      set({
        bandPanelOpen: true,
        bandPanelData: data,
      }),
    closeBandPanel: () =>
      set({
        bandPanelOpen: false,
        bandPanelData: null,
      }),
    openGeniusSequence: (data) =>
      set({
        geniusSequenceOpen: true,
        geniusSequenceData: data,
      }),
    closeGeniusSequence: () =>
      set({
        geniusSequenceOpen: false,
        geniusSequenceData: null,
      }),
    addToast: (message, duration, iconSrc) =>
      set((s) => {
        const clampedDuration = Math.max(
          MIN_TOAST_DURATION,
          Math.min(duration, MAX_TOAST_DURATION),
        );
        const newEntry: ToastEntry = {
          id: crypto.randomUUID(),
          message,
          duration: clampedDuration,
          iconSrc,
          exiting: false,
        };
        return {
          toasts: [...s.toasts.slice(-(MAX_VISIBLE_TOASTS - 1)), newEntry],
        };
      }),
    dismissToast: (id) =>
      set((s) => ({
        toasts: s.toasts.map((t) =>
          t.id === id ? { ...t, exiting: true } : t,
        ),
      })),
    removeToast: (id) =>
      set((s) => ({
        toasts: s.toasts.filter((t) => t.id !== id),
      })),
    setLabelData: (data) => set({ labelData: data }),
    setBadgeGalleryOpen: (open) => {
      set({ badgeGalleryOpen: open, badgeError: null });
      if (open) {
        const state = useGameUIStore.getState();
        void state.loadBadgeData();
      }
    },
    setAuthState: (isAuthenticated, guestId) =>
      set({ isAuthenticated, guestId }),
    setBadgeData: (badges, unlockedIds) =>
      set({ badges, unlockedBadgeIds: unlockedIds }),
    loadBadgeData: async () => {
      const gen = ++loadGeneration;
      try {
        const { isAuthenticated, guestId } = useGameUIStore.getState();
        const allBadges = await fetchBadges({
          source: isAuthenticated ? "auth" : "guest",
        });

        let unlockedIds: string[] = [];
        if (isAuthenticated) {
          const userBadges = await fetchUserBadges();
          unlockedIds = userBadges.map((ub) => ub.badgeId);
        } else if (guestId) {
          unlockedIds = getGuestBadgeIds(guestId);
        }

        if (gen !== loadGeneration) return;
        set({
          badges: allBadges,
          unlockedBadgeIds: unlockedIds,
          badgeError: null,
        });
      } catch (e) {
        if (gen !== loadGeneration) return;
        console.error("[BadgeGallery] Error loading badges", e);
        set({ badgeError: "Nao foi possivel carregar as conquistas." });
      }
    },
    addUnlockedBadge: (badgeId) =>
      set((s) => {
        if (s.unlockedBadgeIds.includes(badgeId)) return s;
        return { unlockedBadgeIds: [...s.unlockedBadgeIds, badgeId] };
      }),
    openInterestDialog: () => set({ isInterestDialogOpen: true }),
    closeInterestDialog: () => set({ isInterestDialogOpen: false }),
    setProgression: (state) => set({ progression: state }),
    setIntroData: (data) => set({ introData: data }),
    setEvidenceBoardOpen: (open) => set({ evidenceBoardOpen: open }),
    setEvidenceBoardSelectedClueId: (id) =>
      set({ evidenceBoardSelectedClueId: id }),
    setCreditsOpen: (open) => set({ creditsOpen: open }),

    startQuiz: (
      questions,
      onComplete,
      isIntermediate = false,
      quizNumber = null,
      attemptNumber = 1,
    ) => {
      set((_s) => ({
        quiz: {
          isVisible: true,
          phase: "questioning",
          questions,
          currentQuestionIndex: 0,
          selectedOptionIndex: null,
          answers: new Array(questions.length).fill(null),
          score: 0,
          isProcessingAnswer: false,
          isIntermediate,
          quizNumber,
          attemptNumber,
          onComplete,
          wrongAttempts: 0,
          attemptFeedback: null,
          feedbackMessage: null,
          revealedAnswer: false,
        },
      }));
    },

    selectOption: () => {
      const { quiz } = get();
      if (
        !quiz.isVisible ||
        quiz.isProcessingAnswer ||
        quiz.questions.length === 0 ||
        quiz.selectedOptionIndex === null ||
        quiz.revealedAnswer
      )
        return;

      const question = quiz.questions[quiz.currentQuestionIndex];
      if (!question) return;

      const isCorrect =
        quiz.selectedOptionIndex === question.correctOptionIndex;
      const wrongAttempts = isCorrect
        ? quiz.wrongAttempts
        : quiz.wrongAttempts + 1;

      const questionId = `${quiz.quizNumber ?? "regular"}-${quiz.currentQuestionIndex}`;
      const quizResult: "correct" | "incorrect" = isCorrect
        ? "correct"
        : "incorrect";

      // Legacy — unchanged.
      posthog.capture("quiz_answer_submitted", {
        quiz_number: quiz.quizNumber,
        question_id: questionId,
        selected_answer: quiz.selectedOptionIndex,
        is_correct: isCorrect,
        attempt_number: quiz.attemptNumber,
        wrong_attempt_number: wrongAttempts,
      });
      // Canonical funnel step — see issue #741's dual-emit table
      // ("+ quiz_result").
      posthog.capture("quiz_answered", {
        quiz_number: quiz.quizNumber,
        question_id: questionId,
        selected_answer: quiz.selectedOptionIndex,
        is_correct: isCorrect,
        quiz_result: quizResult,
        attempt_number: quiz.attemptNumber,
        wrong_attempt_number: wrongAttempts,
      });

      if (isCorrect) {
        const newAnswers = [...quiz.answers];
        newAnswers[quiz.currentQuestionIndex] = "correct";

        set((s) => ({
          quiz: {
            ...s.quiz,
            answers: newAnswers,
            score: s.quiz.score + 1,
            isProcessingAnswer: true,
            attemptFeedback: "correct",
          },
        }));

        setTimeout(() => {
          if (!get().quiz.isProcessingAnswer) return;
          advanceQuiz();
        }, 1000);
        return;
      }

      if (wrongAttempts >= MAX_QUIZ_ATTEMPTS) {
        const newAnswers = [...quiz.answers];
        newAnswers[quiz.currentQuestionIndex] = "wrong";

        set((s) => ({
          quiz: {
            ...s.quiz,
            answers: newAnswers,
            wrongAttempts,
            isProcessingAnswer: true,
            attemptFeedback: "wrong",
            feedbackMessage: null,
            revealedAnswer: true,
          },
        }));
        return;
      }

      set((s) => ({
        quiz: {
          ...s.quiz,
          wrongAttempts,
          isProcessingAnswer: true,
          attemptFeedback: "wrong",
          feedbackMessage: QUIZ_RETRY_MESSAGES[wrongAttempts - 1],
        },
      }));

      setTimeout(() => {
        const state = get();
        if (!state.quiz.isProcessingAnswer || state.quiz.revealedAnswer) return;
        set((s) => ({
          quiz: {
            ...s.quiz,
            isProcessingAnswer: false,
            attemptFeedback: null,
            selectedOptionIndex: null,
          },
        }));
      }, 1000);
    },

    continueAfterReveal: () => {
      const { quiz } = get();
      if (!quiz.isVisible || !quiz.revealedAnswer) return;
      advanceQuiz();
    },

    moveSelection: (dRow: number, dCol: number) => {
      const { quiz } = get();
      if (
        !quiz.isVisible ||
        quiz.isProcessingAnswer ||
        quiz.questions.length === 0
      )
        return;

      const currentIndex = quiz.selectedOptionIndex ?? 0;
      const col = currentIndex % 2;
      const row = currentIndex >= 2 ? 1 : 0;

      const nextCol = (col + dCol + 2) % 2;
      const nextRow = (row + dRow + 2) % 2;
      const nextIndex = nextRow * 2 + nextCol;

      if (nextIndex >= 4) return;

      set((s) => ({
        quiz: {
          ...s.quiz,
          selectedOptionIndex: nextIndex,
        },
      }));
    },

    nextQuestion: () => {
      const { quiz } = get();
      if (!quiz.isVisible || quiz.questions.length === 0) return;

      const nextIndex = quiz.currentQuestionIndex + 1;
      if (nextIndex < quiz.questions.length) {
        set((s) => ({
          quiz: {
            ...s.quiz,
            currentQuestionIndex: nextIndex,
            selectedOptionIndex: null,
          },
        }));
      }
    },

    retryQuiz: () => {
      const { quiz } = get();
      set((_s) => ({
        quiz: {
          ...quiz,
          phase: "questioning",
          currentQuestionIndex: 0,
          selectedOptionIndex: null,
          answers: new Array(quiz.questions.length).fill(null),
          score: 0,
          isProcessingAnswer: false,
          wrongAttempts: 0,
          attemptFeedback: null,
          feedbackMessage: null,
          revealedAnswer: false,
        },
      }));
    },

    closeQuiz: () => {
      set((s) => ({
        quiz: {
          ...s.quiz,
          isVisible: false,
          phase: "questioning",
          isIntermediate: false,
        },
      }));
    },

    resetQuiz: () => {
      set((_s) => ({
        quiz: {
          isVisible: false,
          phase: "questioning",
          questions: [],
          currentQuestionIndex: 0,
          selectedOptionIndex: null,
          answers: [],
          score: 0,
          isProcessingAnswer: false,
          isIntermediate: false,
          quizNumber: null,
          attemptNumber: 1,
          onComplete: null,
          wrongAttempts: 0,
          attemptFeedback: null,
          feedbackMessage: null,
          revealedAnswer: false,
        },
      }));
    },
  };
});

export const selectHintCollectibles = (s: GameUIState) =>
  s.collectibles.filter((c) => c.category === "CLUE_VILLAIN");
