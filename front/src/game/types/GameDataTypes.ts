import type { QuestManager } from "../objects/QuestManager";

/**
 * Conjunto de Tipos de Dados e DTOs (Data Transfer Objects)
 * utilizados para transportar informações entre Sistemas de Jogo, Dados e UI.
 * Segue o princípio de Separation of Concerns (SoC).
 */

/**
 * Definição de uma pergunta de Quiz.
 */
export interface QuizQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

/**
 * Definição de um passo individual de uma missão.
 */
export interface MissionStepDef {
  infoKey: string;
  text: string;
}

/**
 * Estrutura completa de uma missão (Missão Ativa/Definição).
 */
export interface MissionDef {
  id: string;
  title: string;
  steps: MissionStepDef[];
}

export interface UIInitData {
  phaseTitle: string;
  missionsTotal: number;
  questManager: QuestManager;
  missionDefs: Record<string, MissionDef>;
}

/**
 * Dados para abrir uma interface de interação.
 */
export interface InteractionUIData {
  instanceId: string;
  type: string;
  availableItems: { id: string; name: string }[];
  state?: {
    filledSlots?: (string | null)[];
    [key: string]: unknown;
  };
}

/**
 * Dados enviados quando uma interação é confirmada na UI.
 */
export interface InteractionSubmittedData {
  instanceId: string;
  placedItems: (string | null)[];
  [key: string]: unknown;
}
