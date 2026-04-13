import type { NpcConfig } from "../objects/Npc";

/**
 * Interface que representa o estado de interação e observação do Jogador.
 * Utilizada para evitar o uso de 'as any' em componentes que precisam consultar o estado do Player.
 */
export interface IPlayerState {
  isInDialogue: boolean;
  isInspecting: boolean;
}

/**
 * Interface para entidades que possuem configuração de missão/NPC.
 * Utilizada para evitar 'as any' em buscas de NPCs por ID de missão.
 */
export interface INpcEntity {
  config: NpcConfig;
}
