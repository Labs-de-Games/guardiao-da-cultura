import * as Phaser from "phaser";

export interface InteractableConfig {
  x: number;
  y: number;
  texture: string;
  frame?: string | number;
  id?: string;
  name?: string;
}

export abstract class InteractableItem extends Phaser.GameObjects.Sprite {
  public itemId: string;
  public itemName: string;

  constructor(scene: Phaser.Scene, config: InteractableConfig) {
    super(scene, config.x, config.y, config.texture, config.frame);

    this.itemId = config.id || Phaser.Math.RND.uuid();
    this.itemName = config.name || "Interactable";

    scene.add.existing(this);

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
