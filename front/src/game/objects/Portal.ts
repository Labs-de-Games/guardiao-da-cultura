import * as Phaser from "phaser";
import { InteractionComponent } from "./InteractionComponent";
import type { Player } from "./Player";

export class Portal extends Phaser.GameObjects.Zone {
  interaction: InteractionComponent;
  public pairID: string | number;
  public targetPortal: Portal | null = null;
  private playerRef: Player | null = null;

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
      interactionDistanceX: 100,
      interactionDistanceY: 130,
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
      if (p.isInDialogue) return;

      p.isInDialogue = true;
      p.setVelocity(0, 0);

      this.scene.time.delayedCall(100, () => {
        const cam = this.scene.cameras.main;
        cam.stopFollow();

        p.setPosition(target.x - 40, target.y);
        const body = p.body as Phaser.Physics.Arcade.Body;
        if (body) {
          body.reset(target.x - 40, target.y);
        }

        cam.pan(target.x, target.y, 1000, "Sine.easeInOut");

        this.scene.time.delayedCall(1000, () => {
          this.scene.time.delayedCall(100, () => {
            cam.startFollow(p, true, 0.05, 0.05, -40, 0);
            p.isInDialogue = false;
          });
        });
      });
    }
  }

  update() {
    this.interaction.update();
  }
}
