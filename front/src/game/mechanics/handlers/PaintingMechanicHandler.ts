import type * as Phaser from "phaser";
import posthog from "posthog-js";
import { EventBus } from "../../../shared/events/event-bus";
import { GameEvents } from "../../constants/GameEvents";
import { MissionIds, MissionKeys } from "../../constants/MissionConstants";
import { MissionRegistry } from "../../data/MissionRegistry";
import type { Game } from "../../scenes/Game";
import type { PlaceholderInstance } from "../../systems/PlaceholderSystem";
import { InteractiveType } from "../../types/InteractiveTypes";
import {
  findWorkDataById,
  resolveWorkIdFromPlaceholder,
} from "../../utils/WorkDataHelper";
import type { BaseMechanicHandler } from "./BaseMechanicHandler";

export interface DropResult {
  snapped: boolean;
  mismatch?: boolean;
  placeholder?: PlaceholderInstance | null;
}

/**
 * Handles the drag-and-drop interaction for Painting items.
 * Called from Game.handleItemDropped() after PlaceholderSystem.handleDrop().
 */
export class PaintingMechanicHandler implements BaseMechanicHandler {
  public readonly type = InteractiveType.PAINTING;

  constructor(private scoringFloor: number) {}

  /** Not used for paintings — drop path is handled via handleDropResult. */
  public handleInteraction(
    _scene: Phaser.Scene,
    _placeholder: PlaceholderInstance,
    _data: Record<string, unknown>,
  ): boolean {
    return false;
  }

  public handleDropResult(scene: Phaser.Scene, result: DropResult): void {
    const g = scene as Game;

    if (g.markFloorStarted(this.scoringFloor)) {
      posthog.capture("minigame_started", {
        minigame_number: this.scoringFloor + 1,
        level_id: g.getLevelId(),
      });
    }

    if (result.snapped) {
      this.handleSnapped(g);
    } else if (result.mismatch) {
      this.handleMismatch(g, result.placeholder);
    }
  }

  private handleSnapped(g: Game): void {
    const current = g.registry.get("puzzles_solved_flawlessly") || 0;
    g.registry.set("puzzles_solved_flawlessly", current + 1);

    const sysDialogs = g.contentData.messages.SYSTEM_DIALOGUES;
    g.events.emit(
      GameEvents.SHOW_DIALOGUE_REQUEST,
      sysDialogs.PAINTING?.SUCCESS || ["Excelente! Obra posicionada."],
    );

    const missionId = MissionIds.CURATOR;
    g.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
    this.emitMissionProgress(g, missionId);

    if (g.placeholderSystem.checkCategoryCompletion(InteractiveType.PAINTING)) {
      g.completeFloor(this.scoringFloor);
      g.time.delayedCall(500, () => {
        g.events.emit(GameEvents.INFO_COLLECTED, {
          missionId,
          infoKey: MissionKeys.PAINTINGS_DONE,
        });
        g.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
        this.emitMissionProgress(g, missionId);
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
        sysDialogs.PAINTING?.ERROR || ["Esta obra não pertence a este local."],
      );
    }
  }

  private emitMissionProgress(g: Game, missionId: string): void {
    const reqs = g.questManager.getRequiredInfos(missionId);
    EventBus.emit("quest:progress-changed", {
      missionId,
      missionTitle: MissionRegistry[missionId]?.title || "",
      collectedInfos: g.questManager.getCollectedInfos(missionId),
      totalSteps: reqs.length,
      steps: MissionRegistry[missionId]?.steps,
      stepProgress: g.getMissionStepProgress(missionId),
    });
  }
}
