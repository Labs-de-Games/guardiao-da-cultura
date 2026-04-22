import type * as Phaser from "phaser";
import type { PlaceholderInstance } from "../../systems/PlaceholderSystem";
import type { InteractableType } from "../../types/InteractableTypes";

/**
 * Contrato base para todos os handlers de mecânicas de restauração/interação.
 */
export interface BaseMechanicHandler {
  /**
   * O tipo de objeto interagível que este handler suporta.
   */
  readonly type: InteractableType;

  /**
   * Processa a interação baseada nos dados recebidos.
   * @param scene A cena principal do jogo onde a interação ocorre
   * @param placeholder A instância do placeholder interagido
   * @param data Dados arbitrários emitidos pela UI (ex: item escolhido, index)
   * @returns true se a interação gerou uma mudança de estado (ex: peça colocada)
   */
  handleInteraction(
    scene: Phaser.Scene,
    placeholder: PlaceholderInstance,
    data: any,
  ): boolean;
}
