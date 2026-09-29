import type { EffectsManager } from "../objects/EffectsManager";
import type { Game } from "../scenes/Game";

interface QueuedCinematic {
  x: number;
  y: number;
  onFix: () => void;
}

export class SwitchLightCinematicSystem {
  private scene: Game;
  private effects: EffectsManager;
  private isCinematicActive: boolean = false;
  private queue: QueuedCinematic[] = [];

  constructor(scene: Game, effects: EffectsManager) {
    this.scene = scene;
    this.effects = effects;
  }

  public destroy() {
    this.queue = [];
  }

  /**
   * Pauses input, pans the camera to (x, y), runs onFix, then pans back
   * to the player and resumes input. Mirrors LadderCinematicSystem's
   * pause/pan/act/pan-back shape. Calls made while a cinematic is running
   * are queued so no light bar is ever left unfixed.
   */
  public playCinematic(x: number, y: number, onFix: () => void): void {
    if (this.isCinematicActive) {
      this.queue.push({ x, y, onFix });
      return;
    }
    this.isCinematicActive = true;

    this.scene.player.isInDialogue = true;

    const cam = this.scene.cameras.main;
    cam.stopFollow();

    this.effects.panTo(x, y, 1000, "Sine.easeInOut");

    this.scene.time.delayedCall(1000, () => {
      onFix();

      this.scene.time.delayedCall(700, () => {
        this.effects.panTo(
          this.scene.player.x,
          this.scene.player.y - 140,
          1000,
          "Sine.easeInOut",
        );

        this.scene.time.delayedCall(1000, () => {
          cam.startFollow(this.scene.player, true, 0.2, 0.2, 0, 140);
          this.scene.player.isInDialogue = false;
          this.isCinematicActive = false;

          const next = this.queue.shift();
          if (next) this.playCinematic(next.x, next.y, next.onFix);
        });
      });
    });
  }
}
