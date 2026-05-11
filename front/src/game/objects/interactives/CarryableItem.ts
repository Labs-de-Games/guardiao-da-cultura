import type * as Phaser from "phaser";
import { InteractiveItem } from "./InteractiveItem";

export class CarryableItem extends InteractiveItem {
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
