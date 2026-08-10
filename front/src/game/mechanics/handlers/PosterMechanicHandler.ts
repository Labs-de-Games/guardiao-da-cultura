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
 * Handles the drag-and-drop interaction for Poster items.
 * Unlike Paintings, Posters replace the placeholder image with a combined
 * (frame + poster) asset on successful drop, rather than layering over it.
 */
export class PosterMechanicHandler implements BaseMechanicHandler {
  public readonly type = InteractiveType.POSTER;

  constructor(private scoringFloor: number) {}

  /** Not used for posters — drop path is handled via handleDropResult. */
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

    const missionId = MissionIds.CURATOR_L2;
    g.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);

    if (g.placeholderSystem.checkCategoryCompletion(InteractiveType.POSTER)) {
      g.completeFloor(this.scoringFloor);
      g.time.delayedCall(500, () => {
        g.events.emit(GameEvents.INFO_COLLECTED, {
          missionId,
          infoKey: MissionKeys.POSTERS_DONE,
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
        sysDialogs.POSTER?.ERROR ||
          sysDialogs.PAINTING?.ERROR || [
            "Este cartaz não pertence a este local.",
          ],
      );
    }
  }
}
