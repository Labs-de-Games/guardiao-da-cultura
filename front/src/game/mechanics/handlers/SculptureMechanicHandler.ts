import type * as Phaser from "phaser";
import { GameEvents } from "../../constants/GameEvents";
import { MissionIds, MissionKeys } from "../../constants/MissionConstants";
import type { Game } from "../../scenes/Game";
import type { PlaceholderInstance } from "../../systems/PlaceholderSystem";
import { InteractiveType } from "../../types/InteractiveTypes";
import {
  findWorkDataById,
  resolveWorkIdFromPlaceholder,
} from "../../utils/WorkDataHelper";
import type { BaseMechanicHandler } from "./BaseMechanicHandler";
import type { DropResult } from "./PaintingMechanicHandler";

/**
 * Handles the drag-and-drop interaction for Sculpture items.
 * Called from Game.handleItemDropped() after PlaceholderSystem.handleDrop().
 */
export class SculptureMechanicHandler implements BaseMechanicHandler {
  public readonly type = InteractiveType.SCULPTURE;

  constructor(private scoringFloor: number) {}

  /** Not used for sculptures — drop path is handled via handleDropResult. */
  public handleInteraction(
    _scene: Phaser.Scene,
    _placeholder: PlaceholderInstance,
    _data: Record<string, unknown>,
  ): boolean {
    return false;
  }

  public handleDropResult(scene: Phaser.Scene, result: DropResult): void {
    const g = scene as Game;

    if (result.snapped) {
      this.handleSnapped(g);
    } else if (result.mismatch) {
      this.handleMismatch(g, result.placeholder);
    }
  }

  private handleSnapped(g: Game): void {
    const current = g.registry.get("puzzles_solved_flawlessly") || 0;
    g.registry.set("puzzles_solved_flawlessly", current + 1);

    const missionId = MissionIds.CURATOR;
    g.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);

    if (
      g.placeholderSystem.checkCategoryCompletion(InteractiveType.SCULPTURE)
    ) {
      g.completeFloor(this.scoringFloor);
      g.time.delayedCall(500, () => {
        g.events.emit(GameEvents.INFO_COLLECTED, {
          missionId,
          infoKey: MissionKeys.SCULPTURES_DONE,
        });
        g.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
      });
    }
  }

  private handleMismatch(
    g: Game,
    placeholder?: PlaceholderInstance | null,
  ): void {
    g.shakeHorizontal(400, 0.05);
    // AudioManager.playSfxVariation("sfx.object.drop", 2, 0.3);
    g.recordFloorError(this.scoringFloor);

    const workId = placeholder
      ? resolveWorkIdFromPlaceholder(placeholder.id, g.contentData)
      : null;
    const work = workId ? findWorkDataById(workId, g.contentData) : null;
    const feedback = work?.educational?.feedbackError;

    if (feedback) {
      g.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [feedback]);
    } else {
      const sysDialogs = g.contentData.messages.SYSTEM_DIALOGUES;
      g.events.emit(
        GameEvents.SHOW_DIALOGUE_REQUEST,
        sysDialogs.SCULPTURE?.ERROR || ["Esta obra não pertence a este local."],
      );
    }
  }
}
