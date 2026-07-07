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
  }[];
}

export interface ChunkSelectorOpenData {
  instanceId: string;
  availableItems: { id: string; name: string }[];
  filledSlots: (string | null)[];
}

export interface ChunkSelectorSubmitData {
  instanceId: string;
  placedItems: (string | null)[];
}

export interface ToastShowData {
  message: string;
  duration: number;
  iconSrc?: string;
}

export interface DialogueShowData {
  lines: string[];
  callbackId: string;
  screenPosition?: { x: number; y: number };
}

export interface DialogueConfirmData {
  message: string;
  speakerName: string;
  callbackId: string;
  screenPosition?: { x: number; y: number };
}

export interface DialogueCompletedData {
  callbackId: string;
  confirmed?: boolean;
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
  title: string;
  location: string;
  isAvailable: boolean;
  image: string;
}

export interface AutoStartTickData {
  remainingMs: number;
  totalMs: number;
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
  "ui:toast-show": ToastShowData;
  "dialogue:show": DialogueShowData;
  "dialogue:confirm": DialogueConfirmData;
  "dialogue:dismissed": { callbackId: string };
  "dialogue:completed": DialogueCompletedData;
  "dialogue:dequeue-started": undefined;
  "dialogue:queue-cleared": undefined;
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
  "map:marker-changed": MapMarkerChangedData | null;
  "map:auto-start-tick": AutoStartTickData;
  "map:auto-start-canceled": undefined;
  "map:auto-start-completed": undefined;
  "progression:updated": UserProgressState;
  "intro:start": { levelId: string; config: IntroConfig };
  "intro:complete": { levelId: string };
}
