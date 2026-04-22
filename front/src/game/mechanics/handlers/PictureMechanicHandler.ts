import type * as Phaser from "phaser";
import { GameEvents } from "../../constants/GameEvents";
import type { Game } from "../../scenes/Game";
import type { PlaceholderInstance } from "../../systems/PlaceholderSystem";
import { InteractableType } from "../../types/InteractableTypes";
import type { BaseMechanicHandler } from "./BaseMechanicHandler";

export class PictureMechanicHandler implements BaseMechanicHandler {
  public readonly type = InteractableType.PICTURE;

  public handleInteraction(
    scene: Phaser.Scene,
    placeholder: PlaceholderInstance,
    data: Record<string, unknown>,
  ): boolean {
    const gameScene = scene as Game;
    const placedItems = data.placedItems as (string | null)[];
    if (!placedItems) return false;

    const expectedIds = this.normalizeExpectedIds(placeholder.id);
    let anyCorrect = false;
    let allCorrect = true;

    placedItems.forEach((placedId, index) => {
      const cleanPlaced = String(placedId || "").trim();
      const cleanExpected = String(expectedIds[index] || "").trim();

      if (!cleanExpected) return;

      if (cleanPlaced === cleanExpected) {
        this.placeCorrectChunk(gameScene, placeholder, cleanPlaced, index);
        anyCorrect = true;
      } else {
        allCorrect = false;
        if (cleanPlaced) {
          console.log(
            `[PictureMechanic] ❌ Erro no slot ${index}: Esperado "${cleanExpected}", recebido "${cleanPlaced}"`,
          );
        }
      }
    });

    const filledSlots = placeholder.state?.filledSlots as (string | null)[] | undefined;
    const filledCount =
      filledSlots?.filter((s: string | null) => s !== null).length || 0;
    if (filledCount < expectedIds.length) allCorrect = false;

    this.emitFeedback(gameScene, placeholder, allCorrect, anyCorrect);

    return anyCorrect;
  }

  private normalizeExpectedIds(id: string | string[]): string[] {
    if (Array.isArray(id)) return id;
    if (typeof id === "string")
      return id.split(",").map((s: string) => s.trim());
    return [String(id)];
  }

  private placeCorrectChunk(
    gameScene: Game,
    placeholder: PlaceholderInstance,
    itemId: string,
    index: number,
  ) {
    const { posX, posY } = this.calculateSpritePosition(placeholder, index);

    gameScene.add.sprite(posX, posY, itemId).setScale(1).setDepth(1);

    gameScene.player.removeFromInventory(itemId);

    if (!placeholder.state) placeholder.state = {};
    
    if (!placeholder.state.filledSlots) {
      placeholder.state.filledSlots = [null, null, null, null];
    }

    const filledSlots = placeholder.state.filledSlots as (string | null)[];
    filledSlots[index] = itemId;
    console.log(
      `[PictureMechanic] ✅ Sucesso no slot ${index}. Salvo permanentemente.`,
    );
  }

  private calculateSpritePosition(
    placeholder: PlaceholderInstance,
    index: number,
  ) {
    const cellW = placeholder.area.width / 2;
    const cellH = placeholder.area.height / 2;
    const gapX = 60;
    const gapY = 78;

    const startX = placeholder.area.x + cellW / 2 - gapX / 2;
    const startY = placeholder.area.y + cellH / 2 - gapY / 2;

    const col = index % 2;
    const row = Math.floor(index / 2);

    return {
      posX: startX + col * (cellW + gapX),
      posY: startY + row * (cellH + gapY),
    };
  }

  private emitFeedback(
    gameScene: Game,
    placeholder: PlaceholderInstance,
    allCorrect: boolean,
    anyCorrect: boolean,
  ) {
    if (allCorrect) {
      gameScene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [
        "Incrível! Você restaurou o quadro perfeitamente.",
      ]);
      gameScene.placeholderSystem.lockPlaceholder(placeholder.instanceId);
    } else if (anyCorrect) {
      gameScene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [
        "Algumas peças encaixaram, mas outras ainda não estão no lugar certo.",
      ]);
    } else {
      gameScene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [
        "Nada parece ter encaixado... Tente posições diferentes.",
      ]);
    }
  }
}
