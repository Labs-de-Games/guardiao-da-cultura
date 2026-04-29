import type * as Phaser from "phaser";
import { InteractableItem } from "./InteractableItem";

export class DraggableItem extends InteractableItem {
  public isGrabbed: boolean = false;

  public setGrabbed(grabbed: boolean) {
    this.isGrabbed = grabbed;
    if (grabbed) {
      this.setTint(0xaaaaaa);
    } else {
      this.clearTint();
      this.scene.events.emit("item-dropped", this);
    }
  }

  protected onPointerDown(_pointer: Phaser.Input.Pointer) {}
}
