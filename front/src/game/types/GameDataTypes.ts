import type { QuestManager } from "../objects/QuestManager";
import type { PlaceholderSystem } from "../systems/PlaceholderSystem";
import type { InteractiveType } from "./InteractiveTypes";

/**
 * Conjunto de Tipos de Dados e DTOs (Data Transfer Objects)
 * utilizados para transportar informações entre Sistemas de Jogo, Dados e UI.
 * Segue o princípio de Separation of Concerns (SoC).
 */

export interface QuizQuestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface MissionStepDef {
  infoKey: string;
  text: string;
  categoryType?: InteractiveType;
  progressGetter?: () => { filled: number; total: number };
}

export interface MissionDef {
  id: string;
  title: string;
  steps: MissionStepDef[];
}

export interface ContentMetadata {
  title: string;
  author: string;
  description: string;
  year?: string;
  period?: string;
  part?: string;
  dimensions?: string;
  medium?: string;
  place?: string;
}

export interface ContentEducational {
  feedbackError?: string;
  opinion?: string;
  hint?: string;
}

export interface ContentAssets {
  sprite: string;
}

export interface WorkData {
  id: string;
  type: string;
  metadata: ContentMetadata;
  educational: ContentEducational;
  assets: ContentAssets;
}

export interface NpcDialogues {
  intro: string[];
  collecting: string[];
  ready: string[];
  completed: string[];
  success: string[];
  failure: string[];
  start_quiz_question?: string[];
  intermediateQuiz: string[];
}

export interface NpcData {
  name: string;
  missionId?: string;
  dialogues?: NpcDialogues;
}

export interface WorksJson {
  PAINTINGS: Record<string, WorkData>;
  SCULPTURES: Record<string, WorkData>;
  PHOTOS: Record<string, WorkData>;
  POSTERS: Record<string, WorkData>;
  [key: string]: Record<string, WorkData> | undefined;
}

export interface QuizzesJson {
  [missionId: string]: QuizQuestion[];
}

export type IntermediateQuizzesJson = Record<string, QuizQuestion[]>;

export interface NpcsJson {
  npcs: Record<string, NpcData>;
}

export interface MessagesJson {
  SYSTEM_DIALOGUES: {
    [category: string]: {
      SUCCESS: string[];
      ERROR: string[];
    };
  };
  [key: string]: unknown;
}

export interface CollectibleMetadata {
  title: string;
  author?: string;
  year?: string;
  place?: string;
  dimensions?: string;
}

export interface CollectibleEducational {
  description: string;
  medium?: string;
  opinion?: string;
  dimensions?: string;
}

export interface CollectibleAssets {
  sprite: string;
  scaleOnMap?: number;
  scaleOnInspect?: number;
}

export interface CollectibleData {
  id: string;
  metadata: CollectibleMetadata;
  educational: CollectibleEducational;
  assets: CollectibleAssets;
}

export interface CollectiblesJson {
  CLUE_VILLAIN: Record<string, CollectibleData>;
}

export interface ContentJson {
  works: WorksJson;
  quizzes: QuizzesJson;
  intermediateQuizzes: IntermediateQuizzesJson;
  npcs: Record<string, NpcData>;
  messages: MessagesJson;
  collectibles: CollectiblesJson;
}

export interface UIInitData {
  questManager: QuestManager;
  missionDefs: Record<string, MissionDef>;
  placeholderSystem: PlaceholderSystem;
}

export interface InteractionUIData {
  placeholderId: string | string[];
  instanceId: string;
  type: string;
  availableItems: { id: string; name: string }[];
  state?: {
    filledSlots?: (string | null)[];
    [key: string]: unknown;
  };
}

export interface InteractionSubmittedData {
  instanceId: string;
  placedItems: (string | null)[];
  [key: string]: unknown;
}

export interface LabelInfoData {
  title: string;
  author: string;
  description: string;
  year?: string;
  dimensions?: string;
  medium?: string;
  place?: string;
}
