import * as Phaser from "phaser";
import { AudioManager } from "../../audio";
import { InteractiveItem } from "./InteractiveItem";

export class CarryableItem extends InteractiveItem {
  public isCarried: boolean = false;
  private wasFalling: boolean = false;
  private checkLanding: boolean = false;

  constructor(
    scene: Phaser.Scene,
    config: import("./InteractiveItem").InteractiveConfig,
  ) {
    super(scene, config);

    // Check for landing each frame
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    });
  }

  public update() {
    // Skip if not checking for landing
    if (!this.checkLanding) return;

    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;

    const isFalling = body.velocity.y > 50; // Falling threshold

    // Track when we start falling
    if (isFalling && !this.wasFalling) {
      this.wasFalling = true;
    }

    // Detect landing: was falling, now blocked on ground
    if (this.wasFalling && body.blocked.down) {
      this.wasFalling = false;
      this.checkLanding = false;

      // Play drop sound on landing
      AudioManager.playSfx("sfx.object.drop");
    }
  }

  public setCarried(isCarried: boolean) {
    this.isCarried = isCarried;
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setDepth(10);

    if (this.isCarried) {
      if (body) {
        body.setAllowGravity(false);
      }
      // Reset landing detection while carried
      this.checkLanding = false;
      this.wasFalling = false;
    } else {
      if (body) {
        body.setAllowGravity(true);
        body.setGravity(0, 4000);
        // Start checking for landing when released
        this.checkLanding = true;
        this.wasFalling = false;
      }
    }
  }

  protected onPointerDown(_pointer: Phaser.Input.Pointer) {}
}
