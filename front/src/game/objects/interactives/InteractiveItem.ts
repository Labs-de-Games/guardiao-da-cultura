import * as Phaser from "phaser";
import { InteractiveType } from "../../types/InteractiveTypes";

export interface InteractiveConfig {
  x: number;
  y: number;
  texture: string;
  frame?: string | number;
  id?: string;
  name?: string;
  type?: InteractiveType;
}

export abstract class InteractiveItem extends Phaser.Physics.Arcade.Sprite {
  public itemId: string;
  public itemName: string;
  public interactiveType: InteractiveType;

  constructor(scene: Phaser.Scene, config: InteractiveConfig) {
    super(scene, config.x, config.y, config.texture, config.frame);

    this.itemId = config.id || Phaser.Math.RND.uuid();
    this.itemName = config.name || "Interactive";
    this.interactiveType = config.type || InteractiveType.SCULPTURE;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setAllowGravity(true);
      body.setGravity(0, 4000);
    }

    this.setInteractive({ useHandCursor: true });

    this.on("pointerover", this.onPointerOver, this);
    this.on("pointerout", this.onPointerOut, this);
    this.on("pointerdown", this.onPointerDown, this);
  }

  protected onPointerOver() {
    this.setTint(0xdddddd);
  }

  protected onPointerOut() {
    this.clearTint();
  }

  protected abstract onPointerDown(pointer: Phaser.Input.Pointer): void;
}
