import type * as Phaser from "phaser";
import { GameEvents } from "../../constants/GameEvents";
import { MissionIds, MissionKeys } from "../../constants/MissionConstants";
import type { Game } from "../../scenes/Game";
import type { PlaceholderInstance } from "../../systems/PlaceholderSystem";
import { InteractiveType } from "../../types/InteractiveTypes";
import type { BaseMechanicHandler } from "./BaseMechanicHandler";

export class PhotoMechanicHandler implements BaseMechanicHandler {
  public readonly type = InteractiveType.PHOTO;

  public handleInteraction(
    scene: Phaser.Scene,
    placeholder: PlaceholderInstance,
    data: Record<string, unknown>,
  ): boolean {
    const gameScene = scene as Game;
    const placedItems = data.placedItems as (string | null)[];
    if (!placedItems) return false;

    const attempted = placedItems.some((placedId) => {
      const cleanPlaced = String(placedId || "").trim();
      return Boolean(cleanPlaced);
    });

    const expectedIds = this.normalizeExpectedIds(placeholder.id);
    let anyCorrect = false;
    let allCorrect = true;

    const availableInventory = [...gameScene.player.getInventory()];

    placedItems.forEach((placedId, index) => {
      const cleanPlaced = String(placedId || "").trim();
      if (!cleanPlaced) return;

      const invIndex = availableInventory.findIndex(
        (item) => item.itemId === cleanPlaced,
      );

      if (invIndex === -1) {
        console.warn(
          `[PhotoMechanic] ⚠️ Item "${cleanPlaced}" não encontrado no inventário ou já utilizado.`,
        );
        return;
      }

      const cleanExpected = String(expectedIds[index] || "").trim();

      if (cleanPlaced === cleanExpected) {
        availableInventory.splice(invIndex, 1);
        this.placeCorrectChunk(gameScene, placeholder, cleanPlaced, index);
        anyCorrect = true;
      } else {
        allCorrect = false;
      }
    });

    const filledSlots = placeholder.state?.filledSlots as
      | (string | null)[]
      | undefined;
    const filledCount =
      filledSlots?.filter((s: string | null) => s !== null).length || 0;
    if (filledCount < expectedIds.length) allCorrect = false;

    this.emitFeedback(gameScene, placeholder, allCorrect, anyCorrect);

    // Scoring: any non-perfect attempt counts as an error for this floor.
    // Completion is handled inside emitFeedback when allCorrect.
    if (attempted && !allCorrect) {
      gameScene.recordPhotoFloorError();
    }

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
    gameScene.player.removeFromInventory(itemId);

    if (!placeholder.state) placeholder.state = {};

    if (!placeholder.state.filledSlots) {
      placeholder.state.filledSlots = [null, null, null, null];
    }

    const filledSlots = placeholder.state.filledSlots as (string | null)[];
    filledSlots[index] = itemId;
  }

  private emitFeedback(
    gameScene: Game,
    placeholder: PlaceholderInstance,
    allCorrect: boolean,
    anyCorrect: boolean,
  ) {
    if (allCorrect) {
      gameScene.completePhotoFloor();

      // Derive the full photo key from the works data's parent_id convention.
      const fullPhotoKey = "candujar_sem_titulo_yanomami";

      // Scale full image to fit the placeholder area (native chunks: 122x80 each, 2x2 = 244x160).
      const nativeW = 244;
      const nativeH = 160;
      const scaleX = placeholder.area.width / nativeW;
      const scaleY = placeholder.area.height / nativeH;
      const scale = Math.min(scaleX, scaleY);

      const cx = placeholder.area.centerX;
      const cy = placeholder.area.centerY;

      gameScene.add
        .image(cx, cy, fullPhotoKey)
        .setScale(scale * 2.7)
        .setDepth(2);

      gameScene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [
        "Incrível! Você restaurou o quadro perfeitamente.",
      ]);
      gameScene.events.emit(GameEvents.INFO_COLLECTED, {
        missionId: MissionIds.CURATOR,
        infoKey: MissionKeys.PHOTO_DONE,
      });
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
