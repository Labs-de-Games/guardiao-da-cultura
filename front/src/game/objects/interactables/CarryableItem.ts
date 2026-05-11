import type * as Phaser from "phaser";
import { InteractableItem } from "./InteractableItem";

export class CarryableItem extends InteractableItem {
  public isCarried: boolean = false;

  public setCarried(isCarried: boolean) {
    this.isCarried = isCarried;
    if (this.isCarried) {
      this.setTint(0xaaaaaa);
    } else {
      this.clearTint();
    }
  }

  protected onPointerDown(_pointer: Phaser.Input.Pointer) {}
}
