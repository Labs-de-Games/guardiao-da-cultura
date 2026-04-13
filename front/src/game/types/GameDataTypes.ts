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

/**
 * Dados iniciais para configurar a UIScene.
 */
export interface UIInitData {
  phaseTitle: string;
  missionsTotal: number;
  questManager: any; // Tipado como 'any' temporariamente para evitar circular dependency ou importar QuestManager se necessário
  missionDefs: Record<string, MissionDef>;
}
