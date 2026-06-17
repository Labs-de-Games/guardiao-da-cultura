export interface StarsChangedData {
  current: number;
  total: number;
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
}

export interface DialogueConfirmData {
  message: string;
  callbackId: string;
}

export interface DialogueCompletedData {
  callbackId: string;
  confirmed?: boolean;
}

import type { LabelInfoData } from "@/game/types/GameDataTypes";

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
  "inventory:item-collected": ItemCollectedData;
  "inventory:collectibles-sync": CollectiblesSyncData;
  "ui:controls-overlay": ControlsOverlayData;
  "inventory:opened": undefined;
  "inventory:closed": undefined;
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
  "map:marker-changed": MapMarkerChangedData;
}
