import type * as Phaser from "phaser";
import { InteractiveItem } from "./InteractiveItem";

export class DraggableItem extends InteractiveItem {
  public isGrabbed: boolean = false;

  public setGrabbed(grabbed: boolean) {
    this.isGrabbed = grabbed;
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (grabbed) {
      this.setTint(0xaaaaaa);
      if (body) {
        body.moves = false;
      }
    } else {
      this.clearTint();
      this.scene.events.emit("item-dropped", this);
    }
  }

  protected onPointerDown(_pointer: Phaser.Input.Pointer) {}
}
