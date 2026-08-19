import * as Phaser from "phaser";
import { Actions } from "../constants/KeyBindings";
import { InteractionComponent } from "./InteractionComponent";
import type { Player } from "./Player";
import { PLAYER_ANIMS } from "./PlayerConfig";

export class Portal extends Phaser.GameObjects.Zone {
  interaction: InteractionComponent;
  public pairID: string | number;
  public targetPortal: Portal | null = null;
  private playerRef: Player | null = null;
  private POSTER_OFFSET = { x: 40, y: 74 };
  /** Amount the player's scale shrinks by while transitioning through a portal. */
  private PORTAL_SCALE_DELTA = 0.5;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    pairID: string | number,
  ) {
    super(scene, x, y, width, height);
    this.pairID = pairID;

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body

    this.interaction = new InteractionComponent(scene, this, {
      dialogText: "Entrar",
      dialogueLines: [],
      onInteract: () => this.handleInteract(),
      interactionDistance: 130,
      actionKey: [Actions.MOVE_UP, Actions.INTERACT],
      playInteractSound: false,
    });

    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    });
  }

  setPlayerTracking(player: Player) {
    this.playerRef = player;
    this.interaction.setPlayerTracking(player);
  }

  private handleInteract() {
    const target = this.targetPortal;
    const p = this.playerRef;

    if (target && p) {
      const body = p.body as Phaser.Physics.Arcade.Body | null;

      if (!body || !body.blocked.down) return;
      if (!p.isCarrying && p.getNearbyCarryableItem()) return;
      if (!p.isCarrying && p.getNearbyDraggableItem()) return;
      if (p.isInDialogue) return;

      p.isInDialogue = true;
      p.setVelocity(0, 0);

      const backAnim = p.isCarrying
        ? PLAYER_ANIMS.BACK_CARRYING.key
        : PLAYER_ANIMS.BACK.key;
      p.anims.play(backAnim, true);

      if (body) {
        body.enable = false;
      }

      const originalScaleX = p.scaleX;
      const originalScaleY = p.scaleY;
      const originalItemScaleX = p.carriedItem?.scaleX ?? 1;
      const originalItemScaleY = p.carriedItem?.scaleY ?? 1;

      const enterScaleX = originalScaleX - this.PORTAL_SCALE_DELTA;
      const enterScaleY = originalScaleY - this.PORTAL_SCALE_DELTA;

      if (p.isCarrying && p.carriedItem) {
        this.scene.tweens.add({
          targets: p.carriedItem,
          scaleX: originalItemScaleX * (enterScaleX / originalScaleX),
          scaleY: originalItemScaleY * (enterScaleY / originalScaleY),
          alpha: 0,
          duration: 500,
          ease: "Cubic.in",
        });
      }

      this.scene.tweens.add({
        targets: p,
        scaleX: enterScaleX,
        scaleY: enterScaleY,
        alpha: 0,
        duration: 500,
        ease: "Cubic.in",
        onComplete: () => {
          const cam = this.scene.cameras.main;
          cam.stopFollow();

          p.setPosition(target.x - 40, target.y);
          if (body) {
            body.reset(target.x - 40, target.y);
          }

          cam.pan(target.x, target.y, 1000, "Sine.easeInOut");

          this.scene.time.delayedCall(1000, () => {
            const frontAnim = p.isCarrying
              ? PLAYER_ANIMS.FRONT_CARRYING.key
              : PLAYER_ANIMS.IDLE_SOUTH.key;
            p.anims.play(frontAnim, true);
            p.setPortalExitIdleAnim(frontAnim);

            if (p.isCarrying && p.carriedItem) {
              const carriedItem = p.carriedItem;
              const carriedItemBody = carriedItem.body as
                | Phaser.Physics.Arcade.Body
                | undefined;

              carriedItem.setPosition(
                target.x - this.POSTER_OFFSET.x,
                target.y - this.POSTER_OFFSET.y,
              );
              carriedItemBody?.updateFromGameObject();

              this.scene.tweens.add({
                targets: carriedItem,
                scaleX: originalItemScaleX,
                scaleY: originalItemScaleY,
                alpha: 1,
                duration: 500,
                ease: "Cubic.out",
              });
            }

            this.scene.tweens.add({
              targets: p,
              scaleX: originalScaleX,
              scaleY: originalScaleY,
              alpha: 1,
              duration: 500,
              ease: "Cubic.out",
              onComplete: () => {
                if (body) {
                  body.enable = true;
                }
                cam.startFollow(p, true, 0.05, 0.05, -40, 0);
                p.isInDialogue = false;
              },
            });
          });
        },
      });
    }
  }

  update() {
    this.interaction.update();
  }
}
