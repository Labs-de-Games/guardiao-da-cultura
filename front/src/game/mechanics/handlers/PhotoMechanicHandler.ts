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

  public placeCorrectChunk(
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

    gameScene.placeholderSystem.updatePhotoCell(
      placeholder.instanceId,
      index,
      itemId,
    );
  }

  private emitFeedback(
    gameScene: Game,
    placeholder: PlaceholderInstance,
    allCorrect: boolean,
    anyCorrect: boolean,
  ) {
    // Always emit progress on any interaction
    gameScene.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);

    if (allCorrect) {
      gameScene.showSpotlightBeam(
        2000,
        placeholder.area.centerX,
        placeholder.area.centerY,
      );
      gameScene.playConfettiBurst(
        placeholder.area.centerX,
        placeholder.area.centerY,
      );
      gameScene.completePhotoFloor();

      gameScene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [
        "Incrível! Agora sim é possível ver a fotografia completa!",
      ]);

      // Two-phase: show 4/4 first, then [✓] after delay
      gameScene.time.delayedCall(500, () => {
        gameScene.events.emit(GameEvents.INFO_COLLECTED, {
          missionId: MissionIds.CURATOR,
          infoKey: MissionKeys.PHOTO_DONE,
        });
        gameScene.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
      });

      gameScene.placeholderSystem.lockPlaceholder(placeholder.instanceId);
      gameScene.lightBarSystem?.turnOnByPlaceholder(placeholder.instanceId);
    } else if (anyCorrect) {
      gameScene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [
        "Só algumas peças encaixaram, faltam outras.",
      ]);
    } else {
      gameScene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [
        "Nada parece ter encaixado…",
      ]);
    }
  }
}
