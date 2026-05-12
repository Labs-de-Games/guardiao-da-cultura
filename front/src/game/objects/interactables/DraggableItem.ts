import type * as Phaser from "phaser";
import { type InteractableConfig, InteractableItem } from "./InteractableItem";

export class DraggableItem extends InteractableItem {
  public isGrabbed: boolean = false;

  constructor(scene: Phaser.Scene, config: InteractableConfig) {
    super(scene, config);
    this.setDepth(10);
  }

  public setGrabbed(grabbed: boolean) {
    this.isGrabbed = grabbed;
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (grabbed) {
      this.setDepth(11);
      if (body) {
        body.moves = false;
      }
    } else {
      this.setDepth(10);
      this.scene.events.emit("item-dropped", this);
    }
  }

  protected onPointerDown(_pointer: Phaser.Input.Pointer) {}
}
