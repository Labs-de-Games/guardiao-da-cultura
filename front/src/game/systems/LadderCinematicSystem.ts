import type * as Phaser from "phaser";
import { AudioManager } from "../audio";
import type { EffectsManager } from "../objects/EffectsManager";
import type { Game } from "../scenes/Game";

export class LadderCinematicSystem {
  private scene: Game;
  private effects: EffectsManager;
  private mapScale: number;
  private isCinematicActive: boolean = false;

  constructor(scene: Game, effects: EffectsManager, mapScale: number) {
    this.scene = scene;
    this.effects = effects;
    this.mapScale = mapScale;
  }

  public destroy() {}

  /**
   * Plays the ladder cinematic using an existing sprite.
   * The sprite is already visible on screen — we just drop it, then destroy it
   * and reveal the tile layer that replaces it.
   */
  public playCinematic(
    ladderSprite: Phaser.GameObjects.Sprite,
    targetLayer: Phaser.Tilemaps.TilemapLayer,
  ) {
    if (this.isCinematicActive) return;
    this.isCinematicActive = true;

    // 1. Disable player input
    this.scene.player.isInDialogue = true;

    // 2. Stop camera follow
    const cam = this.scene.cameras.main;
    cam.stopFollow();

    // 3. Pan to the ladder
    const targetX = ladderSprite.x;
    const targetY = ladderSprite.y;

    this.effects.panTo(targetX, targetY + 320, 1000, "Sine.easeInOut");

    this.scene.time.delayedCall(1000, () => {
      // 4. Drop the ladder to the ground with gravity
      this.scene.physics.add.existing(ladderSprite);
      const body = ladderSprite.body as Phaser.Physics.Arcade.Body;
      body.setGravityY(800);
      body.setCollideWorldBounds(false);

      // 5. Listen for when it hits the ground (tween fallback for timing)
      const dropDuration = 600;
      const dropDistance = 320;
      this.scene.tweens.add({
        targets: ladderSprite,
        y: targetY + dropDistance,
        duration: dropDuration,
        ease: "Bounce.easeOut",
        onComplete: () => {
          body.setGravityY(0);
          body.setVelocityY(0);

          AudioManager.playSfx("sfx.object.drop");
          this.effects.shake(250, 0.01);

          this.scene.time.delayedCall(250, () => {
            // 6. Destroy the ladder sprite and reveal the tile layer
            ladderSprite.destroy();
            targetLayer.setVisible(true);

            // 7. Pan back to player
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
        },
      });
    });
  }
}
