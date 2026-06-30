import * as Phaser from "phaser";

const HINT_GAP = 35;
const HINT_DEPTH = 15;
const HINT_SCALE = 0.5;

export interface HintTarget {
  x: number;
  y: number;
  interactionY: number;
  displayHeight: number;
  active: boolean;
  interactionDistance: number;
  hintY?: number;
}

export class HintKeySystem {
  private targets: HintTarget[] = [];
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  registerItems(targets: HintTarget[]) {
    this.targets = targets;
  }

  update(
    playerX: number,
    playerY: number,
    playerBody?: Phaser.Physics.Arcade.Body | null,
    isPanelOpen = false,
  ) {
    if (isPanelOpen) {
      this.hide();
      return;
    }

    let closest: HintTarget | null = null;
    let minDist = Number.POSITIVE_INFINITY;
    const playerFootY = playerBody ? playerBody.bottom : playerY;

    for (const target of this.targets) {
      if (!target.active) continue;
      const dist = Phaser.Math.Distance.Between(
        playerX,
        playerFootY,
        target.x,
        target.interactionY,
      );
      if (dist < target.interactionDistance && dist < minDist) {
        minDist = dist;
        closest = target;
      }
    }

    if (closest) {
      const hintWorldY = closest.hintY ?? closest.y - closest.displayHeight;
      this.show(closest.x, hintWorldY);
    } else {
      this.hide();
    }
  }

  private show(worldX: number, worldY: number) {
    if (!this.sprite) {
      this.sprite = this.scene.add
        .sprite(0, 0, "interactive_hint_key")
        .setDepth(HINT_DEPTH)
        .setScale(HINT_SCALE);
    }
    this.sprite.setPosition(worldX, worldY - HINT_GAP).setVisible(true);
  }

  private hide() {
    if (this.sprite) {
      this.sprite.setVisible(false);
    }
  }

  destroy() {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
    this.targets = [];
  }
}
