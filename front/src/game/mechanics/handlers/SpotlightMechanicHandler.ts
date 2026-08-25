import type * as Phaser from "phaser";
import { GameEvents } from "../../constants/GameEvents";
import { MissionIds, MissionKeys } from "../../constants/MissionConstants";
import type { Game } from "../../scenes/Game";
import type { PlaceholderInstance } from "../../systems/PlaceholderSystem";
import type { SpotlightInstance } from "../../systems/SpotlightSystem";
import { InteractiveType } from "../../types/InteractiveTypes";
import type { BaseMechanicHandler } from "./BaseMechanicHandler";

/**
 * Handles the interaction for Spotlight items.
 * Called when player presses the interaction key near a spotlight.
 */
export class SpotlightMechanicHandler implements BaseMechanicHandler {
  public readonly type = InteractiveType.SPOTLIGHT;

  constructor(private scoringFloor: number) {}

  public handleInteraction(
    _scene: Phaser.Scene,
    _placeholder: PlaceholderInstance,
    _data: Record<string, unknown>,
  ): boolean {
    return false;
  }

  public handleActivation(gameScene: Game, spotlight: SpotlightInstance): void {
    if (spotlight.isCorrect) {
      this.handleCorrect(gameScene, spotlight);
    } else {
      this.handleWrong(gameScene);
    }
  }

  private handleCorrect(gameScene: Game, spotlight: SpotlightInstance): void {
    gameScene.sound.play("sfx.puzzle.success", { volume: 0.7 });
    gameScene.playConfettiBurst(spotlight.sprite.x, spotlight.sprite.y);
    gameScene.completeFloor(this.scoringFloor);
    gameScene.spotlightSystem.lockAll();

    gameScene.time.delayedCall(500, () => {
      gameScene.events.emit(GameEvents.INFO_COLLECTED, {
        missionId: MissionIds.CURATOR_L2,
        infoKey: MissionKeys.SPOTLIGHTS_DONE,
      });
    });
  }

  private handleWrong(gameScene: Game): void {
    gameScene.shakeHorizontal(400, 0.05);
    gameScene.recordFloorError(this.scoringFloor);

    const sysDialogs = gameScene.contentData.messages?.SYSTEM_DIALOGUES;
    const errorDialogue = sysDialogs?.SPOTLIGHT?.ERROR || [
      "Esta não é a cor de luz correta para o palco.",
    ];
    gameScene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, errorDialogue);
  }
}
