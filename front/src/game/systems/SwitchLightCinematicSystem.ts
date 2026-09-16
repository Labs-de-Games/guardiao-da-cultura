import type { EffectsManager } from "../objects/EffectsManager";
import type { Game } from "../scenes/Game";

export class SwitchLightCinematicSystem {
  private scene: Game;
  private effects: EffectsManager;
  private isCinematicActive: boolean = false;

  constructor(scene: Game, effects: EffectsManager) {
    this.scene = scene;
    this.effects = effects;
  }

  public destroy() {}

  /**
   * Pauses input, pans the camera to (x, y), runs onFix, then pans back
   * to the player and resumes input. Mirrors LadderCinematicSystem's
   * pause/pan/act/pan-back shape.
   */
  public playCinematic(x: number, y: number, onFix: () => void): void {
    if (this.isCinematicActive) return;
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
        });
      });
    });
  }
}
