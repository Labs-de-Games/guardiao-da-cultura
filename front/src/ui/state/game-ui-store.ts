import posthog from "posthog-js";
import { create } from "zustand";
import {
  INVESTIGATION_CLUE_HEARTS,
  INVESTIGATION_LEVEL_ID,
  INVESTIGATION_MAX_WRONG_ATTEMPTS,
  INVESTIGATION_SLOTS,
  starsForWrongAttempts,
} from "@/game/constants/Investigation";
import type {
  ClueVerdict,
  InvestigationClue,
  InvestigationPayload,
  SuspectBoard,
  TraitValue,
} from "@/game/types/InvestigationTypes";
import type { UserProgressState } from "@/game/types/ProgressionTypes";
import type { InvestigationCursor } from "@/ui/investigation/investigation-keyboard";
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

/**
 * A fresh investigation run. Wrong attempts deliberately reset on every entry,
 * so returning from the map always offers a shot at the full five stars; only
 * the best result survives, and that lives in progression, not here.
 */
const EMPTY_INVESTIGATION = {
  open: false,
  payload: null,
  boards: {},
  clueHearts: {},
  hoveredClueKey: null,
  cursor: null,
  heldClueKey: null,
  exitConfirmOpen: false,
  pendingAccusationId: null,
  lastWrongSuspectId: null,
  wrongAttempts: 0,
  wrongSuspectIds: [],
  revealed: false,
  result: null,
  tutorial: {
    active: false,
    stepIndex: 0,
    focusSuspectId: null,
    focusClueKey: null,
    restoresBoard: false,
    demoPlaced: false,
  },
} satisfies GameUIState["investigation"];

function emptyBoard(): SuspectBoard {
  return {
    slots: Array.from({ length: INVESTIGATION_SLOTS }, () => null),
    verdicts: {},
  };
}

/** A suspect's board, created lazily the first time a clue lands on them. */
function boardFor(
  boards: Record<string, SuspectBoard>,
  suspectId: string,
): SuspectBoard {
  return boards[suspectId] ?? emptyBoard();
}

/** An accusation needs something behind it: at least one clue on the seat. */
function hasSlottedClue(
  boards: Record<string, SuspectBoard>,
  suspectId: string,
): boolean {
  return (boards[suspectId]?.slots ?? []).some((k) => k !== null);
}

/** Every clue back to full lives — the state a run, or a retry, starts from. */
function fullHearts(clues: InvestigationClue[]): Record<string, number> {
  return Object.fromEntries(
    clues.map((c) => [c.key, INVESTIGATION_CLUE_HEARTS]),
  );
}

/**
 * Which suspect, if any, is holding a clue.
 *
 * A clue is one physical object: it sits on at most one suspect at a time, and
 * a clue already on the board cannot be dragged straight to another seat — it
 * has to be taken off the first one, deliberately, before it can move.
 */
export function holderOf(
  boards: Record<string, SuspectBoard>,
  clueKey: string,
): string | null {
  for (const [suspectId, board] of Object.entries(boards)) {
    if (board.slots.includes(clueKey)) return suspectId;
  }
  return null;
}

/**
 * The seat the walkthrough demonstrates on.
 *
 * The first suspect, which is the one its highlight points at. The exception is
 * a seat with no room left, which only a player replaying the lesson mid-run can
 * arrive at: the rehearsed drop has to be possible, because nothing but doing it
 * gets past that step.
 */
function tutorialSeatId(
  suspects: InvestigationPayload["suspects"],
  boards: Record<string, SuspectBoard>,
  wrongSuspectIds: string[],
): string | null {
  const open = suspects.find(
    (suspect) =>
      !wrongSuspectIds.includes(suspect.id) &&
      (boards[suspect.id]?.slots ?? []).filter((k) => k !== null).length <
        INVESTIGATION_SLOTS,
  );
  return open?.id ?? suspects[0]?.id ?? null;
}

/** The dossier's answer for a trait, turned into check feedback. */
function verdictFor(value: TraitValue | undefined): ClueVerdict {
  if (value === "sim") return "quente";
  if (value === "nao") return "frio";
  return "morno";
}

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

  /**
   * Suspect identification phase. Kept apart from the components that render it
   * so the investigation's progress is plain state, not view state.
   */
  investigation: {
    open: boolean;
    payload: InvestigationPayload | null;
    /** Slotted clues and their verdicts, per suspect. */
    boards: Record<string, SuspectBoard>;
    /** Drops each clue has left. At zero the clue is nailed where it sits. */
    clueHearts: Record<string, number>;
    hoveredClueKey: string | null;
    /**
     * Where the keyboard cursor sits, or `null` while nobody has touched a key.
     *
     * View state, like `hoveredClueKey` — it lives here so the rail, the seats
     * and the slots can each light their own cell without the screen threading
     * a cursor down through three layers of props.
     */
    cursor: InvestigationCursor | null;
    /**
     * The clue the keyboard is carrying. Picking one up is free; only landing
     * it on a seat spends a heart, exactly as a drag does.
     */
    heldClueKey: string | null;
    /**
     * The "quer mesmo sair?" gate. Leaving forfeits the board as it stands —
     * a fresh entry starts from an empty one — so VOLTAR and ESC ask first.
     */
    exitConfirmOpen: boolean;
    /** Suspect awaiting "tem certeza?" confirmation. */
    pendingAccusationId: string | null;
    /**
     * The suspect just accused by mistake. Holds their alibi panel open, and
     * holds the board still behind it: the clues only go home once the player
     * dismisses the panel, so the reset is something they watch happen.
     */
    lastWrongSuspectId: string | null;
    wrongAttempts: number;
    wrongSuspectIds: string[];
    /** True once four wrong accusations forced the answer into the open. */
    revealed: boolean;
    result: { stars: number; correct: boolean } | null;
    /**
     * The coach-mark walkthrough, which runs on the real board rather than a
     * mock one. It follows whichever seat and clue the player used for the
     * demonstration drop, so the later steps point at their own move.
     */
    tutorial: {
      active: boolean;
      stepIndex: number;
      focusSuspectId: string | null;
      focusClueKey: string | null;
      /**
       * Whether closing it should undo the demonstration. True only when it
       * opened on an untouched board — replaying it mid-run must not hand the
       * player back the hearts they already spent.
       */
      restoresBoard: boolean;
      /**
       * Set by the one drop the walkthrough asks for. From then until it
       * closes, the board is frozen: the lesson is a single rehearsed move, not
       * an open sandbox with a caption over it.
       */
      demoPlaced: boolean;
    };
  };

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

  openInvestigation: (payload: InvestigationPayload) => void;
  closeInvestigation: () => void;
  setHoveredClue: (key: string | null) => void;
  /** Moves the keyboard cursor, or hides it again with `null`. */
  setCursor: (cursor: InvestigationCursor | null) => void;
  /** Picks a clue up off the rail, or puts down whatever is in hand. */
  holdClue: (clueKey: string | null) => void;
  /** Opens or dismisses the "quer mesmo sair?" gate. */
  setExitConfirmOpen: (open: boolean) => void;
  /**
   * Drops a clue onto a suspect: costs a heart, grades it on the spot, and
   * vacates whatever slot the clue held before. Refused once it is out of
   * hearts, or when the target slot is already nailed shut.
   */
  placeClueInSlot: (
    suspectId: string,
    slotIndex: number,
    clueKey: string,
  ) => void;
  /** Pulls a clue back to the rail. Refused once its last heart is spent. */
  clearSlot: (suspectId: string, slotIndex: number) => void;
  requestAccusation: (suspectId: string | null) => void;
  /**
   * Closes the alibi panel and settles the cost of the wrong accusation: the
   * board empties and every clue comes back at full hearts, so the next try is
   * a real second run rather than the leftovers of the first.
   */
  dismissWrongAccusation: () => void;
  /** Opens the walkthrough at its first step. */
  startTutorial: () => void;
  advanceTutorial: () => void;
  /**
   * Closes the walkthrough and undoes it: the demonstration drop is lifted and
   * every clue gets its hearts back, so the lesson costs the player nothing. A
   * run that already reached a verdict is left exactly as it stands.
   */
  endTutorial: () => void;
  /** Returns the outcome so the caller can emit it; null when already resolved. */
  accuseSuspect: (
    suspectId: string,
  ) => { stars: number; correct: boolean; wrongAttempts: number } | null;

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

    investigation: { ...EMPTY_INVESTIGATION },

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

    openInvestigation: (payload) =>
      set({
        investigation: {
          ...EMPTY_INVESTIGATION,
          open: true,
          payload,
          clueHearts: fullHearts(payload.clues),
        },
      }),

    closeInvestigation: () =>
      set({ investigation: { ...EMPTY_INVESTIGATION } }),

    setHoveredClue: (key) =>
      set((s) => ({
        investigation: { ...s.investigation, hoveredClueKey: key },
      })),

    setCursor: (cursor) =>
      set((s) => ({ investigation: { ...s.investigation, cursor } })),

    holdClue: (clueKey) =>
      set((s) => ({
        investigation: { ...s.investigation, heldClueKey: clueKey },
      })),

    setExitConfirmOpen: (open) =>
      set((s) => ({
        investigation: { ...s.investigation, exitConfirmOpen: open },
      })),

    // Reads through `get()` rather than inside the `set()` updater so the
    // analytics call is a side effect of the action, not of the reducer.
    placeClueInSlot: (suspectId, slotIndex, clueKey) => {
      const { investigation } = get();
      const { payload, clueHearts, wrongSuspectIds, tutorial, boards } =
        investigation;
      const suspect = payload?.suspects.find((x) => x.id === suspectId);
      const clue = payload?.clues.find((c) => c.key === clueKey);
      if (!suspect || !clue) return;

      // A cleared suspect is out of the game, and a clue with no hearts left
      // has already been committed somewhere it can never leave.
      if (wrongSuspectIds.includes(suspectId)) return;
      if ((clueHearts[clueKey] ?? 0) <= 0) return;

      // The walkthrough asks for exactly one drop and then stops taking them.
      if (tutorial.active && tutorial.demoPlaced) return;

      // And it asks for that drop on one seat: the one it is pointing at. A
      // clue cannot land where the highlight is not, whether it was dragged
      // there or carried there.
      if (
        tutorial.active &&
        tutorial.focusSuspectId &&
        suspectId !== tutorial.focusSuspectId
      ) {
        return;
      }

      // Already pinned to a suspect: it has to come off that seat first.
      if (holderOf(boards, clueKey)) return;

      const board = boardFor(boards, suspectId);

      // The slot may already hold a clue. It gives way — unless it is out of
      // hearts, in which case it owns that slot for the rest of the run.
      const occupant = board.slots[slotIndex];
      if (occupant && (clueHearts[occupant] ?? 0) <= 0) return;

      const slots = [...board.slots];
      slots[slotIndex] = clueKey;

      const verdicts = { ...board.verdicts };
      if (occupant) delete verdicts[occupant];
      const verdict = verdictFor(suspect.traits[clue.traitId]);
      verdicts[clueKey] = verdict;

      const heartsLeft = clueHearts[clueKey] - 1;

      set((s) => ({
        investigation: {
          ...s.investigation,
          boards: { ...boards, [suspectId]: { slots, verdicts } },
          clueHearts: { ...clueHearts, [clueKey]: heartsLeft },
          // However it got here — dragged or carried — the hand is empty now.
          heldClueKey: null,
          // The walkthrough's later steps explain this very drop, so they
          // follow the seat and the clue the player actually chose.
          tutorial: tutorial.active
            ? {
                ...tutorial,
                focusSuspectId: suspectId,
                focusClueKey: clueKey,
                demoPlaced: true,
              }
            : tutorial,
        },
      }));

      posthog.capture("investigation_clue_placed", {
        level_id: INVESTIGATION_LEVEL_ID,
        clue_key: clueKey,
        clue_source: clue.source,
        trait_id: clue.traitId,
        suspect_id: suspectId,
        slot_index: slotIndex,
        verdict,
        hearts_left: heartsLeft,
        // The clue this drop pushed out of the slot, when it landed on a full
        // one — `null` on an empty slot.
        replaced_clue_key: occupant,
        // Which run at the board this is; a wrong accusation starts a new one.
        attempt_number: investigation.wrongAttempts + 1,
        // The walkthrough scripts exactly one drop. Without this flag it would
        // read as ordinary play and inflate every placement metric.
        is_tutorial: tutorial.active,
      });
    },

    clearSlot: (suspectId, slotIndex) =>
      set((s) => {
        // The demonstration drop stays put until the walkthrough is done with
        // it — its remaining steps are all pointing at it.
        if (s.investigation.tutorial.active) return s;

        const board = boardFor(s.investigation.boards, suspectId);
        const clueKey = board.slots[slotIndex];
        if (clueKey === null) return s;
        if ((s.investigation.clueHearts[clueKey] ?? 0) <= 0) return s;

        const slots = [...board.slots];
        slots[slotIndex] = null;
        const { [clueKey]: _gone, ...verdicts } = board.verdicts;

        return {
          investigation: {
            ...s.investigation,
            boards: {
              ...s.investigation.boards,
              [suspectId]: { slots, verdicts },
            },
          },
        };
      }),

    requestAccusation: (suspectId) =>
      set((s) => {
        // The walkthrough's last step points at a live ACUSAR button to show
        // what lights it up. It stays a demonstration: nobody burns a star on
        // a move the tutorial put under their cursor. Cancelling still works.
        if (suspectId !== null && s.investigation.tutorial.active) return s;

        return {
          investigation: { ...s.investigation, pendingAccusationId: suspectId },
        };
      }),

    dismissWrongAccusation: () =>
      set((s) => {
        if (!s.investigation.lastWrongSuspectId) return s;
        // On the last miss there is no next round to clear the board for —
        // dismissing just hands the screen over to the result panel.
        if (s.investigation.result) {
          return {
            investigation: { ...s.investigation, lastWrongSuspectId: null },
          };
        }
        return {
          investigation: {
            ...s.investigation,
            lastWrongSuspectId: null,
            boards: {},
            clueHearts: fullHearts(s.investigation.payload?.clues ?? []),
            heldClueKey: null,
          },
        };
      }),

    startTutorial: () =>
      set((s) => ({
        investigation: {
          ...s.investigation,
          tutorial: {
            active: true,
            stepIndex: 0,
            focusSuspectId: tutorialSeatId(
              s.investigation.payload?.suspects ?? [],
              s.investigation.boards,
              s.investigation.wrongSuspectIds,
            ),
            focusClueKey: s.investigation.payload?.clues[0]?.key ?? null,
            // Nothing has been spent yet, so the lesson can be given back.
            restoresBoard: Object.values(s.investigation.clueHearts).every(
              (hearts) => hearts === INVESTIGATION_CLUE_HEARTS,
            ),
            demoPlaced: false,
          },
        },
      })),

    advanceTutorial: () =>
      set((s) =>
        s.investigation.tutorial.active
          ? {
              investigation: {
                ...s.investigation,
                tutorial: {
                  ...s.investigation.tutorial,
                  stepIndex: s.investigation.tutorial.stepIndex + 1,
                },
              },
            }
          : s,
      ),

    endTutorial: () =>
      set((s) => {
        const tutorial = {
          active: false,
          stepIndex: 0,
          focusSuspectId: null,
          focusClueKey: null,
          restoresBoard: false,
          demoPlaced: false,
        };

        // Once the run is decided the board is the record of it, not a sandbox,
        // and a walkthrough opened mid-run is a re-read of the rules, not a
        // free reset of everything spent so far.
        if (s.investigation.result || !s.investigation.tutorial.restoresBoard) {
          return { investigation: { ...s.investigation, tutorial } };
        }

        return {
          investigation: {
            ...s.investigation,
            tutorial,
            boards: {},
            clueHearts: fullHearts(s.investigation.payload?.clues ?? []),
            pendingAccusationId: null,
            lastWrongSuspectId: null,
          },
        };
      }),

    accuseSuspect: (suspectId) => {
      const { investigation } = get();
      const suspects = investigation.payload?.suspects;
      if (!suspects || investigation.result) return null;

      const accused = suspects.find((s) => s.id === suspectId);
      if (!accused) return null;
      if (investigation.wrongSuspectIds.includes(suspectId)) return null;
      // Nobody is accused on a hunch: the seat has to carry evidence.
      if (!hasSlottedClue(investigation.boards, suspectId)) return null;

      // What the player was looking at when they committed. `hot` is the part
      // worth watching: an accusation made against cold evidence is a guess,
      // and that reads very differently from one the board actually supports.
      const board = investigation.boards[suspectId];
      const slotted = board?.slots.filter((k): k is string => k !== null) ?? [];
      const evidence = {
        clues_on_suspect: slotted.length,
        hot_clues: slotted.filter((k) => board?.verdicts[k] === "quente")
          .length,
        cold_clues: slotted.filter((k) => board?.verdicts[k] === "frio").length,
      };

      /** Every accusation reports, resolved or not. `stars` is null mid-run. */
      const captureAccusation = (props: {
        is_correct: boolean;
        wrong_attempts: number;
        stars: number | null;
        revealed: boolean;
      }) =>
        posthog.capture("investigation_suspect_accused", {
          level_id: INVESTIGATION_LEVEL_ID,
          suspect_id: suspectId,
          // 1-based: the first accusation of this run is attempt 1.
          attempt_number: investigation.wrongAttempts + 1,
          ...evidence,
          ...props,
        });

      if (accused.isCulprit) {
        const stars = starsForWrongAttempts(investigation.wrongAttempts);
        set((s) => ({
          investigation: {
            ...s.investigation,
            pendingAccusationId: null,
            result: { stars, correct: true },
          },
        }));

        captureAccusation({
          is_correct: true,
          wrong_attempts: investigation.wrongAttempts,
          stars,
          revealed: false,
        });
        // A dedicated success event: the phase is won here, and the funnel
        // should not have to filter the accusation stream to find that out.
        posthog.capture("investigation_suspect_identified", {
          level_id: INVESTIGATION_LEVEL_ID,
          suspect_id: suspectId,
          stars,
          wrong_attempts: investigation.wrongAttempts,
          attempt_number: investigation.wrongAttempts + 1,
          ...evidence,
          // How much evidence the player actually brought in from the levels,
          // before the curator topped it up.
          clues_collected: investigation.payload?.collectedCount ?? 0,
          clues_available: investigation.payload?.clues.length ?? 0,
        });

        return {
          stars,
          correct: true,
          wrongAttempts: investigation.wrongAttempts,
        };
      }

      const wrongAttempts = investigation.wrongAttempts + 1;
      const wrongSuspectIds = [...investigation.wrongSuspectIds, suspectId];

      // Out of attempts: the curator names the culprit, and the run closes on
      // the consolation star rather than leaving the player stuck.
      if (wrongAttempts >= INVESTIGATION_MAX_WRONG_ATTEMPTS) {
        const stars = starsForWrongAttempts(wrongAttempts);
        set((s) => ({
          investigation: {
            ...s.investigation,
            wrongAttempts,
            wrongSuspectIds,
            revealed: true,
            pendingAccusationId: null,
            // The last miss is still a miss: the suspect answers back before
            // the result panel takes over and names the real culprit.
            lastWrongSuspectId: suspectId,
            result: { stars, correct: false },
          },
        }));

        captureAccusation({
          is_correct: false,
          wrong_attempts: wrongAttempts,
          stars,
          revealed: true,
        });
        return { stars, correct: false, wrongAttempts };
      }

      // A wrong name costs a star and shadows that seat. The board is left
      // exactly as the player arranged it — `dismissWrongAccusation` clears it
      // once they have read the alibi, so the clues can be seen going home.
      set((s) => ({
        investigation: {
          ...s.investigation,
          wrongAttempts,
          wrongSuspectIds,
          pendingAccusationId: null,
          lastWrongSuspectId: suspectId,
        },
      }));

      captureAccusation({
        is_correct: false,
        wrong_attempts: wrongAttempts,
        stars: null,
        revealed: false,
      });
      return null;
    },

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

      posthog.capture("quiz_answer_submitted", {
        quiz_number: quiz.quizNumber,
        question_id: `${quiz.quizNumber ?? "regular"}-${quiz.currentQuestionIndex}`,
        selected_answer: quiz.selectedOptionIndex,
        is_correct: isCorrect,
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
