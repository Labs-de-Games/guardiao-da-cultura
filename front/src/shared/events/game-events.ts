export interface StarsChangedData {
  current: number;
  total: number;
  score: number;
}

export interface StepProgress {
  filled: number;
  total: number;
}

export interface QuestProgressData {
  missionId: string;
  missionTitle: string;
  collectedInfos: string[];
  totalSteps: number;
  steps?: { infoKey: string; text: string }[];
  stepProgress?: StepProgress[];
}

export interface ItemCollectedData {
  itemId: string;
  itemName: string;
  category: string;
}

export interface GamePauseData {
  reason: string;
}

export interface GameResumeData {
  reason: string;
}

export interface ControlsOverlayData {
  open: boolean;
}

export interface SidebarToggleData {
  open: boolean;
}

export interface BadgeGalleryToggleData {
  open: boolean;
}

export interface BadgeUnlockedData {
  badgeId: string;
  badgeName: string;
  iconKey: string;
}

export interface CollectiblesSyncData {
  entries: {
    id: string;
    name: string;
    category: string;
    collected: boolean;
    board?: {
      position: { x: number; y: number; rotation: number };
      connectedTo: string[];
    };
    educational?: { description: string; medium?: string; opinion?: string };
    metadata?: {
      title: string;
      author?: string;
      year?: string;
      place?: string;
    };
  }[];
}

export interface ChunkSelectorOpenData {
  instanceId: string;
  availableItems: { id: string; name: string; levelId: string }[];
  filledSlots: (string | null)[];
  expectedSlots: string[];
}

export interface CostumeSelectorOpenData {
  instanceId: string;
  correctCostume: string;
  equippedParts: {
    head: string | null;
    torso: string | null;
    feet: string | null;
  };
  lockedParts: { head: boolean; torso: boolean; feet: boolean };
}

export interface ChunkSelectorSubmitData {
  instanceId: string;
  placedItems: (string | null)[];
}

export interface ChunkSlotPlacedData {
  instanceId: string;
  slotIndex: number;
  itemId: string;
}

export interface ChunkSlotRejectedData {
  instanceId: string;
  slotIndex: number;
  itemId: string;
}

export interface StepSequenceOpenData {
  instanceId: string;
  videoPath: string;
  availableSteps: { id: string; name: string; imagePath: string }[];
  expectedSequence: string[];
  filledSlots?: (string | null)[];
}

export interface StepSequenceSubmitData {
  instanceId: string;
  placedSteps: (string | null)[];
}

export interface StepSlotData {
  instanceId: string;
  slotIndex: number;
  stepId: string;
}

/**
 * One failed submit, not one wrong slot: a blind first try emits a
 * `ui:step-rejected` per wrong slot, which would read as several failures.
 * The player's unit of error on a sequence puzzle is the attempt.
 */
export interface StepSequenceRejectedData {
  instanceId: string;
  attemptNumber: number;
  wrongCount: number;
  correctCount: number;
  totalSlots: number;
}

export interface ToastShowData {
  message: string;
  duration: number;
  iconSrc?: string;
}

export interface DialogueShowData {
  lines: string[];
  callbackId: string;
  worldPosition?: { x: number; y: number };
}

export interface DialogueConfirmData {
  message: string;
  speakerName: string;
  callbackId: string;
  worldPosition?: { x: number; y: number };
}

export interface DialogueCompletedData {
  callbackId: string;
  confirmed?: boolean;
}

export interface DialogueCameraSyncData {
  worldViewX: number;
  worldViewY: number;
  zoom: number;
}

export interface CanvasViewportData {
  /** Canvas's CSS-pixel offset from #game-container's top-left (letterbox offset). */
  left: number;
  top: number;
  /** Canvas's actual displayed CSS-pixel size. */
  width: number;
  height: number;
  /** Displayed size divided by the base game resolution (LayoutConfig.GAME.WIDTH/HEIGHT). */
  scaleX: number;
  scaleY: number;
}

import type { LabelInfoData } from "@/game/types/GameDataTypes";
import type { UserProgressState } from "@/game/types/ProgressionTypes";
import type { IntroConfig } from "@/ui/intro/types";

export type { LabelInfoData };

export interface QuizQuestionData {
  question: string;
  options: string[];
  correctOptionIndex: number;
}

export interface QuizStartData {
  questions: QuizQuestionData[];
  onComplete: (score: number) => void;
}

export interface QuizAnswerData {
  optionIndex: number;
  isCorrect: boolean;
}

export interface QuizCompleteData {
  score: number;
  totalQuestions: number;
}

export interface MapMarkerChangedData {
  markerId: string;
  title: string;
  shortlocation: string;
  location: string;
  isAvailable: boolean;
  screenX: number;
  screenY: number;
  isCompleted?: boolean;
  image?: string;
  levelId?: string;
}

export interface AutoStartTickData {
  remainingMs: number;
  totalMs: number;
}

export type GeniusColor = "green" | "red" | "yellow" | "blue";

export interface GeniusSequenceOpenData {
  instanceId: string;
}

export interface GeniusSequenceCompleteData {
  instanceId: string;
}

export interface GeniusSequenceRejectedData {
  instanceId: string;
  attemptNumber: number;
  wrongCount: number;
  correctCount: number;
  totalRounds: number;
}

export interface GeniusSoundNoteData {
  color: GeniusColor;
}

export interface GameEventMap {
  "game:ready": { userId: string };
  "game:started": undefined;
  "game:ended": undefined;
  "game:pause-requested": GamePauseData;
  "game:resume-requested": GameResumeData;
  "player:stars-changed": StarsChangedData;
  "quest:progress-changed": QuestProgressData;
  "quest:mission-status-changed": {
    missionId: string;
    status: "accepted" | "completed" | "failed";
  };
  "collectible:item-collected": ItemCollectedData;
  "collectible:collectibles-sync": CollectiblesSyncData;
  "ui:controls-overlay": ControlsOverlayData;
  "sidebar:toggled": SidebarToggleData;
  "ui:chunk-selector-open": ChunkSelectorOpenData;
  "ui:chunk-selector-close": undefined;
  "ui:chunk-selector-submit": ChunkSelectorSubmitData;
  "ui:costume-selector-open": CostumeSelectorOpenData;
  "ui:costume-selector-close": undefined;
  "ui:band-panel-open": { instanceId: string; id: string; options: string[] };
  "ui:band-panel-close": undefined;
  "ui:band-choice-rejected": { instanceId: string; musicianId: string };
  "ui:band-confirm": { instanceId: string; musicianId: string };
  "ui:costume-part-rejected": {
    instanceId: string;
    partType: string;
    partId: string | null;
    reason: string;
  };
  "ui:costume-part-selected": {
    instanceId: string;
    partType: string;
    partId: string;
    isCorrect: boolean;
    isLocked: boolean;
  };
  "ui:costume-confirm": {
    instanceId: string;
    equippedParts: {
      head: string | null;
      torso: string | null;
      feet: string | null;
    };
  };
  "ui:step-sequence-open": StepSequenceOpenData;
  "ui:step-sequence-close": undefined;
  "ui:step-sequence-submit": StepSequenceSubmitData;
  "ui:step-placed": StepSlotData;
  "ui:step-rejected": StepSlotData;
  "ui:step-sequence-rejected": StepSequenceRejectedData;
  "ui:genius-sequence-open": GeniusSequenceOpenData;
  "ui:genius-sequence-close": undefined;
  "ui:genius-sequence-complete": GeniusSequenceCompleteData;
  "ui:genius-sequence-rejected": GeniusSequenceRejectedData;
  "ui:sound-genius-note": GeniusSoundNoteData;
  "ui:chunk-slot-placed": ChunkSlotPlacedData;
  "ui:chunk-slot-rejected": ChunkSlotRejectedData;
  "ui:toast-show": ToastShowData;
  "ui:sound-click": undefined;
  "ui:sound-hover": undefined;
  "ui:sound-modal-open": undefined;
  "ui:sound-modal-close": undefined;
  "ui:sound-badge-unlock": undefined;
  "ui:sound-level-complete": undefined;
  "dialogue:show": DialogueShowData;
  "dialogue:confirm": DialogueConfirmData;
  "dialogue:dismissed": { callbackId: string };
  "dialogue:completed": DialogueCompletedData;
  "dialogue:dequeue-started": undefined;
  "dialogue:queue-cleared": undefined;
  "dialogue:camera-sync": DialogueCameraSyncData;
  "canvas:viewport-changed": CanvasViewportData;
  "ui:label-show": LabelInfoData;
  "ui:label-hide": undefined;
  "ui:badge-gallery-toggle": BadgeGalleryToggleData;
  "badge:unlocked": BadgeUnlockedData;
  "quiz:start": QuizStartData;
  "quiz:answer-selected": QuizAnswerData;
  "quiz:question-change": { currentIndex: number; total: number };
  "quiz:complete": QuizCompleteData;
  "quiz:close": undefined;
  "quiz:retry": undefined;
  "quiz:next-level": undefined;
  "map:marker-changed": MapMarkerChangedData | null;
  "map:auto-start-tick": AutoStartTickData;
  "map:auto-start-canceled": undefined;
  "map:auto-start-completed": undefined;
  "progression:updated": UserProgressState;
  "intro:start": { levelId: string; config: IntroConfig };
  "intro:complete": { levelId: string };
  "intro:music-start": { levelId: string };
  "intro:rollout-start": { levelId: string };
  "star-animation-complete": undefined;
  "ladder:cinematic-complete": undefined;
  "tutorial:shown": { tutorialId: string };
  "tutorial:dismissed": { tutorialId: string };
  "ui:evidence-board-open-with-clue": { clueId: string | null };
  "credits:open": undefined;
  "credits:close": undefined;
}
