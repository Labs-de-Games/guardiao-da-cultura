import type * as Phaser from "phaser";
import type { PlaceholderInstance } from "../systems/PlaceholderSystem";
import type { InteractiveType } from "../types/InteractiveTypes";
import type { BaseMechanicHandler } from "./handlers/BaseMechanicHandler";

/**
 * Gerenciador central de mecânicas de interação.
 * Elimina a necessidade do Game.ts conhecer os detalhes de cada tipo de puzzle.
 */
export class MechanicsManager {
  private handlers: Map<InteractiveType, BaseMechanicHandler> = new Map();

  /**
   * Registra um novo handler de mecânica.
   */
  public registerHandler(handler: BaseMechanicHandler): void {
    this.handlers.set(handler.type, handler);
  }

  /**
   * Delega a interação para o handler correspondente.
   * @param scene A cena principal do jogo
   * @param placeholder O placeholder que está sendo interagido
   * @param data Dados da interação vindos da UI
   * @returns true se a interação foi tratada
   */
  public handleInteraction(
    scene: Phaser.Scene,
    placeholder: PlaceholderInstance,
    data: Record<string, unknown>,
  ): boolean {
    const handler = this.handlers.get(placeholder.type);

    if (!handler) {
      console.warn(
        `[MechanicsManager] Nenhum handler registrado para o tipo: ${placeholder.type}`,
      );
      return false;
    }

    return handler.handleInteraction(scene, placeholder, data);
  }
}
