import * as Phaser from "phaser";
import type { CarryableItem } from "../objects/interactables/CarryableItem";
import type { DraggableItem } from "../objects/interactables/DraggableItem";

interface ExtendedRectangle extends Phaser.Geom.Rectangle {
  id: string;
  acceptedType?: string;
  sculptureId?: string;
  paintingId?: string;
  hintSprite?: Phaser.GameObjects.Sprite;
}

export interface PlaceholderConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
  acceptedType?: string;
  sculptureId?: string;
  paintingId?: string;
}

export class PlaceholderSystem {
  private placeholders: ExtendedRectangle[] = [];
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public registerPlaceholder(config: PlaceholderConfig) {
    // If it's a point object (width/height 0), give it a default hit area
    const minSize = 128; // Increased from 64 for better detection scale
    const finalWidth = config.width || minSize;
    const finalHeight = config.height || minSize;

    const rect = new Phaser.Geom.Rectangle(
      config.x - (config.width === 0 ? finalWidth / 2 : 0),
      config.y - (config.height === 0 ? finalHeight / 2 : 0),
      finalWidth,
      finalHeight,
    ) as ExtendedRectangle;

    rect.id = config.id;
    rect.acceptedType = config.acceptedType;
    rect.sculptureId = config.sculptureId;
    rect.paintingId = config.paintingId;

    // Create Hint (Sparkle)
    const sparkle = this.scene.add.sprite(
      rect.centerX,
      rect.centerY,
      "sparkle",
      0,
    );
    sparkle.setScale(4);
    sparkle.setAlpha(0.8);
    sparkle.setDepth(100);

    if (this.scene.anims.exists("sparkle_hint_anim")) {
      sparkle.play("sparkle_hint_anim", true);
    }

    rect.hintSprite = sparkle;
    this.placeholders.push(rect);
  }

  public isOverPlaceholder(
    x: number,
    y: number,
    item: DraggableItem | CarryableItem,
  ): ExtendedRectangle | null {
    const SNAP_THRESHOLD = 150; // Pixels distance to consider a match

    for (const p of this.placeholders) {
      // 1. Check if inside the rectangle area
      const isInside = Phaser.Geom.Rectangle.Contains(p, x, y);

      // 2. Check distance to center (better for point-based placeholders)
      const dist = Phaser.Math.Distance.Between(x, y, p.centerX, p.centerY);
      const isCloseEnough = dist < SNAP_THRESHOLD;

      if (isInside || isCloseEnough) {
        if (
          p.acceptedType &&
          p.acceptedType !== "sculpture" &&
          p.acceptedType !== "painting"
        )
          continue;
        if (
          (p.sculptureId && item.itemId !== p.sculptureId) ||
          (p.paintingId && item.itemId !== p.paintingId)
        ) {
          console.log(
            `[PlaceholderSystem] ID mismatch at ${p.id}: expected "${p.sculptureId}", got "${item.itemId}"`,
          );
          continue;
        }
        return p;
      }
    }
    return null;
  }

  public handleDrop(item: DraggableItem): {
    snapped: boolean;
    mismatch?: boolean;
  } {
    const placeholder = this.isOverPlaceholder(item.x, item.y, item);

    if (placeholder) {
      // Snap item to center
      item.x = placeholder.centerX;
      item.y = placeholder.centerY;

      // Stop and remove hint sparkle
      if (placeholder.hintSprite) {
        placeholder.hintSprite.stop();
        placeholder.hintSprite.destroy();
        placeholder.hintSprite = undefined;
      }

      console.log(
        `[PlaceholderSystem] SUCCESS: Item ${item.itemName} (${item.itemId}) matched slot ${placeholder.id}`,
      );
      return { snapped: true };
    }

    // Secondary check: was it at least near a placeholder but with wrong ID?
    let nearbyMismatch = false;
    for (const p of this.placeholders) {
      const dist = Phaser.Math.Distance.Between(
        item.x,
        item.y,
        p.centerX,
        p.centerY,
      );
      if (dist < 150) {
        nearbyMismatch = true;
        break;
      }
    }

    if (nearbyMismatch) {
      console.log(
        `[PlaceholderSystem] MISMATCH: Item ${item.itemId} is not accepted here.`,
      );
      return { snapped: false, mismatch: true };
    }

    console.log(
      `[PlaceholderSystem] No matching placeholder found at (${Math.round(item.x)}, ${Math.round(item.y)}) for item ${item.itemId}`,
    );
    return { snapped: false };
  }
}
