import type * as Phaser from "phaser";
import { InteractableItem } from "./InteractableItem";

export class CarryableItem extends InteractableItem {
  public isCarried: boolean = false;

  public setCarried(isCarried: boolean) {
    this.isCarried = isCarried;
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setDepth(10);

    if (this.isCarried) {
      if (body) {
        body.setAllowGravity(false);
      }
    } else {
      if (body) {
        body.setAllowGravity(true);
        body.setGravity(0, 4000);
      }
    }
  }

  protected onPointerDown(_pointer: Phaser.Input.Pointer) {}
}
