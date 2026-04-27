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
      // When released by player, check for placeholders in the scene
      this.scene.events.emit("item-dropped", this);
    }
  }

  protected onPointerDown(_pointer: Phaser.Input.Pointer) {
    // Basic pointer down interactions if any, keyboard handles movement
  }

  // snapBack is no longer needed as items should stay where they are dropped.
  public snapBack() {
    console.log(
      `[DraggableItem] snapBack called for ${this.itemName}, but free-drop is enabled.`,
    );
  }
}
