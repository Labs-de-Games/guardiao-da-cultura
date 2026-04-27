import * as Phaser from "phaser";
import type { CarryableItem } from "../objects/interactables/CarryableItem";
import type { DraggableItem } from "../objects/interactables/DraggableItem";

import type { InteractableType } from "../types/InteractableTypes";

export interface PlaceholderInstance {
  area: Phaser.Geom.Rectangle;
  instanceId: string;
  type: InteractableType;
  id: string | string[]; // Can be a single ID or a list of accepted fragment IDs
  state?: Record<string, unknown>; // Estado genérico para qualquer mecânica (ex: filledSlots, currentRotation)
  hintSprite?: Phaser.GameObjects.Sprite;
}

export interface PlaceholderConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  instanceId: string;
  type: InteractableType;
  id: string | string[];
  state?: Record<string, unknown>;
}

export class PlaceholderSystem {
  private placeholders: PlaceholderInstance[] = [];
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
    );

    const instance: PlaceholderInstance = {
      area: rect,
      instanceId: config.instanceId,
      type: config.type,
      id: config.id,
      state: config.state || {},
    };

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

    instance.hintSprite = sparkle;
    this.placeholders.push(instance);
  }

  public isOverPlaceholder(
    x: number,
    y: number,
    item: DraggableItem | CarryableItem,
  ): PlaceholderInstance | null {
    const SNAP_THRESHOLD = 150; // Pixels distance to consider a match

    for (const p of this.placeholders) {
      // 1. Check if inside the rectangle area
      const isInside = Phaser.Geom.Rectangle.Contains(p.area, x, y);

      // 2. Check distance to center (better for point-based placeholders)
      const dist = Phaser.Math.Distance.Between(
        x,
        y,
        p.area.centerX,
        p.area.centerY,
      );
      const isCloseEnough = dist < SNAP_THRESHOLD;

      if (isInside || isCloseEnough) {
        // Validation logic using type and id
        if (item.interactableType !== p.type) continue;

        const isMatch = Array.isArray(p.id)
          ? p.id.includes(item.itemId)
          : item.itemId === p.id;

        if (!isMatch) {
          console.log(
            `[PlaceholderSystem] ID mismatch at ${p.instanceId}: expected ${Array.isArray(p.id) ? p.id.join(", ") : p.id}, got "${item.itemId}"`,
          );
          continue;
        }
        return p;
      }
    }
    return null;
  }

  public handleDrop(item: DraggableItem | CarryableItem): {
    snapped: boolean;
    mismatch?: boolean;
  } {
    const placeholder = this.isOverPlaceholder(item.x, item.y, item);

    if (placeholder) {
      // Snap item to center
      item.x = placeholder.area.centerX;
      item.y = placeholder.area.centerY;

      // Lock the item: it cannot be moved or interacted with anymore
      item.disableInteractive();

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
        p.area.centerX,
        p.area.centerY,
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

  /**
   * Finds a placeholder near the given coordinates, filtered by type.
   * Useful for active interactions (e.g. opening a selection UI).
   */
  public getNearbyPlaceholder(
    x: number,
    y: number,
    maxDistance: number = 100,
    type?: InteractableType,
  ): PlaceholderInstance | null {
    let closest: PlaceholderInstance | null = null;
    let minDist = maxDistance;

    for (const p of this.placeholders) {
      if (type && p.type !== type) continue;

      const dist = Phaser.Math.Distance.Between(
        x,
        y,
        p.area.centerX,
        p.area.centerY,
      );
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    }
    return closest;
  }

  public getPlaceholderByInstanceId(
    instanceId: string,
  ): PlaceholderInstance | null {
    return this.placeholders.find((p) => p.instanceId === instanceId) || null;
  }

  public lockPlaceholder(instanceId: string) {
    const p = this.getPlaceholderByInstanceId(instanceId);
    if (p) {
      if (p.hintSprite) {
        p.hintSprite.destroy();
        p.hintSprite = undefined;
      }
      // Remove from active list or mark as filled
      this.placeholders = this.placeholders.filter(
        (item) => item.instanceId !== instanceId,
      );
    }
  }
}
