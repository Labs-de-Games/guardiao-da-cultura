import { create } from "zustand";
import type { BadgeConfig } from "../../lib/badgesApi";
import { fetchBadges, fetchUserBadges } from "../../lib/badgesApi";
import { getGuestBadgeIds } from "../../lib/badgesStorage";

let loadGeneration = 0;

export { useDialogueStore } from "./dialogue-store";

const MAX_VISIBLE_TOASTS = 5;
const MIN_TOAST_DURATION = 1000;
const MAX_TOAST_DURATION = 10000;

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

export const UI_Z_INDEX = {
  OVERLAY: 10,
  SIDEBAR: 20,
  PANEL: 30,
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

export interface CollectibleEntry {
  id: string;
  name: string;
  collected: boolean;
  category: string;
}

export interface ChunkSelectorData {
  instanceId: string;
  availableItems: { id: string; name: string }[];
  filledSlots: (string | null)[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
}

export interface GameUIState {
  sidebarOpen: boolean;
  controlsOpen: boolean;
  gameStarted: boolean;
  activeMapMarker: MapMarkerChangedData | null;
  autoStartProgress: number | null;
  stars: number;
  totalStars: number;
  missions: MissionProgress[];
  collectibles: CollectibleEntry[];
  chunkSelectorOpen: boolean;
  chunkSelectorData: ChunkSelectorData | null;
  toasts: ToastEntry[];
  labelData: LabelInfoData | null;
  badgeGalleryOpen: boolean;
  badges: BadgeConfig[];
  unlockedBadgeIds: string[];
  badgeError: string | null;
  isAuthenticated: boolean;
  guestId: string | null;
  isInterestDialogOpen: boolean;

  quiz: {
    isVisible: boolean;
    phase: "questioning" | "performance";
    questions: QuizQuestion[];
    currentQuestionIndex: number;
    selectedOptionIndex: number;
    answers: ("correct" | "wrong" | null)[];
    score: number;
    isProcessingAnswer: boolean;
    onComplete: ((score: number) => void) | null;
  };

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setControlsOpen: (open: boolean) => void;
  setGameStarted: (started: boolean) => void;
  startGame: () => void;
  endGame: () => void;
  setActiveMapMarker: (marker: MapMarkerChangedData | null) => void;
  setAutoStartProgress: (progress: number | null) => void;
  setStars: (current: number, total: number) => void;
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

  startQuiz: (
    questions: QuizQuestion[],
    onComplete: (score: number) => void,
  ) => void;
  selectOption: () => void;
  moveSelection: (dRow: number, dCol: number) => void;
  nextQuestion: () => void;
  retryQuiz: () => void;
  closeQuiz: () => void;
  resetQuiz: () => void;
}

export const useGameUIStore = create<GameUIState>()((set, get) => ({
  sidebarOpen: false,
  controlsOpen: false,
  gameStarted: false,
  activeMapMarker: {
    title: "Inhotim",
    location: "Brumadinho, Minas Gerais",
    isAvailable: true,
  },
  autoStartProgress: null,
  stars: 0,
  totalStars: 0,
  missions: [],
  collectibles: [],
  chunkSelectorOpen: false,
  chunkSelectorData: null,
  toasts: [],
  labelData: null,
  badgeGalleryOpen: false,
  badges: [],
  unlockedBadgeIds: [],
  badgeError: null,
  isAuthenticated: false,
  guestId: null,
  isInterestDialogOpen: false,

  quiz: {
    isVisible: false,
    phase: "questioning",
    questions: [],
    currentQuestionIndex: 0,
    selectedOptionIndex: 0,
    answers: [],
    score: 0,
    isProcessingAnswer: false,
    onComplete: null,
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setControlsOpen: (open) => set({ controlsOpen: open }),
  setGameStarted: (started) => set({ gameStarted: started }),
  startGame: () => {
    const { gameStarted } = get();
    if (!gameStarted) {
      set({ gameStarted: true });
    }
  },
  endGame: () => {
    const { gameStarted } = get();
    if (gameStarted) {
      set({ gameStarted: false, sidebarOpen: false });
    }
  },
  setActiveMapMarker: (marker) => set({ activeMapMarker: marker }),
  setAutoStartProgress: (progress) => set({ autoStartProgress: progress }),
  setStars: (current, total) => set({ stars: current, totalStars: total }),
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
      toasts: s.toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
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
  setAuthState: (isAuthenticated, guestId) => set({ isAuthenticated, guestId }),
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

  startQuiz: (questions, onComplete) => {
    set((_s) => ({
      quiz: {
        isVisible: true,
        phase: "questioning",
        questions,
        currentQuestionIndex: 0,
        selectedOptionIndex: 0,
        answers: new Array(questions.length).fill(null),
        score: 0,
        isProcessingAnswer: false,
        onComplete,
      },
    }));
  },

  selectOption: () => {
    const { quiz } = get();
    if (
      !quiz.isVisible ||
      quiz.isProcessingAnswer ||
      quiz.questions.length === 0
    )
      return;

    const question = quiz.questions[quiz.currentQuestionIndex];
    if (!question) return;

    const isCorrect = quiz.selectedOptionIndex === question.correctOptionIndex;
    const newAnswers = [...quiz.answers];
    newAnswers[quiz.currentQuestionIndex] = isCorrect ? "correct" : "wrong";

    set((s) => ({
      quiz: {
        ...s.quiz,
        answers: newAnswers,
        score: isCorrect ? s.quiz.score + 1 : s.quiz.score,
        isProcessingAnswer: true,
      },
    }));

    setTimeout(() => {
      const state = get();
      if (!state.quiz.isProcessingAnswer) return;

      const nextIndex = state.quiz.currentQuestionIndex + 1;
      if (nextIndex < state.quiz.questions.length) {
        set((s) => ({
          quiz: {
            ...s.quiz,
            currentQuestionIndex: nextIndex,
            selectedOptionIndex: 0,
            isProcessingAnswer: false,
          },
        }));
      } else {
        const finalScore = state.quiz.score;
        const _totalQuestions = state.quiz.questions.length;
        const onComplete = state.quiz.onComplete;

        set((s) => ({
          quiz: {
            ...s.quiz,
            phase: "performance",
            isProcessingAnswer: false,
          },
        }));

        if (onComplete) {
          onComplete(finalScore);
        }
      }
    }, 1000);
  },

  moveSelection: (dRow: number, dCol: number) => {
    const { quiz } = get();
    if (
      !quiz.isVisible ||
      quiz.isProcessingAnswer ||
      quiz.questions.length === 0
    )
      return;

    const col = quiz.selectedOptionIndex % 2;
    const row = quiz.selectedOptionIndex >= 2 ? 1 : 0;

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
          selectedOptionIndex: 0,
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
        selectedOptionIndex: 0,
        answers: new Array(quiz.questions.length).fill(null),
        score: 0,
        isProcessingAnswer: false,
      },
    }));
  },

  closeQuiz: () => {
    set((s) => ({
      quiz: {
        ...s.quiz,
        isVisible: false,
        phase: "questioning",
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
        selectedOptionIndex: 0,
        answers: [],
        score: 0,
        isProcessingAnswer: false,
        onComplete: null,
      },
    }));
  },
}));

export const selectHintCollectibles = (s: GameUIState) =>
  s.collectibles.filter(
    (c) => c.category === "CLUE_VILLAIN" || c.category === "CLUE_NEXT",
  );

export const selectInventoryCollectibles = (s: GameUIState) =>
  s.collectibles.filter((c) => c.category === "COLLECT");
