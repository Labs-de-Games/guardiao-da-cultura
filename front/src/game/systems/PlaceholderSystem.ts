import * as Phaser from "phaser";
import { LayoutConfig } from "../constants/LayoutConfig";
import type { CarryableItem } from "../objects/interactables/CarryableItem";
import type { DraggableItem } from "../objects/interactables/DraggableItem";
import { InteractableType } from "../types/InteractableTypes";
import { TiledUtils } from "../utils/TiledUtils";

export interface PlaceholderInstance {
  area: Phaser.Geom.Rectangle;
  instanceId: string;
  type: InteractableType;
  id: string | string[];
  state?: Record<string, unknown>;
  hintSprite?: Phaser.GameObjects.Sprite;
  isFilled?: boolean;
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

  public registerAllFromLayer(
    layer: Phaser.Tilemaps.ObjectLayer,
    scale: number = LayoutConfig.GAME.MAP_SCALE,
  ) {
    if (!layer?.objects) return;

    layer.objects.forEach((obj) => {
      // Only process objects of class 'PlaceholderInstance'
      if (obj.type !== "PlaceholderInstance") return;

      const typeStr = TiledUtils.getProperty(obj, "type");
      const rawProp = TiledUtils.getProperty(obj, "id");
      const targetId = TiledUtils.parseTargetIds(rawProp);
      const scaled = TiledUtils.scaleCoords(obj, scale);

      this.registerPlaceholder({
        x: scaled.x,
        y: scaled.y,
        width: scaled.width,
        height: scaled.height,
        instanceId: obj.name || Phaser.Math.RND.uuid(),
        type: typeStr as InteractableType,
        id: targetId,
        state:
          typeStr === InteractableType.PICTURE
            ? { filledSlots: [null, null, null, null] }
            : {},
      });
    });
  }

  public registerPlaceholder(config: PlaceholderConfig) {
    const minSize = 128;
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
      isFilled: false,
    };

    const sparkle = this.scene.add.sprite(
      rect.centerX,
      rect.centerY,
      "sparkle",
      0,
    );
    sparkle.setScale(0.1);
    sparkle.setAlpha(1);
    sparkle.setDepth(11);

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
    const SNAP_THRESHOLD = 150;

    for (const p of this.placeholders) {
      const checkY = y;

      const isInside = Phaser.Geom.Rectangle.Contains(p.area, x, checkY);

      const dist = Phaser.Math.Distance.Between(
        x,
        checkY,
        p.area.centerX,
        p.area.centerY,
      );
      const isCloseEnough = dist < SNAP_THRESHOLD;

      if (isInside || isCloseEnough) {
        if (item.interactableType !== p.type) continue;

        const isMatch = Array.isArray(p.id)
          ? p.id.includes(item.itemId)
          : item.itemId === p.id;

        if (!isMatch) {
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
    payload?: unknown;
  } {
    const placeholder = this.isOverPlaceholder(item.x, item.y, item);

    if (placeholder) {
      item.x = placeholder.area.centerX;

      if (item.interactableType !== InteractableType.SCULPTURE) {
        item.y = placeholder.area.centerY;
      }

      item.disableInteractive();

      if (placeholder.hintSprite) {
        placeholder.hintSprite.stop();
        placeholder.hintSprite.destroy();
        placeholder.hintSprite = undefined;
      }

      const body = item.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setVelocity(0, 0);
        body.checkCollision.none = true;
      }

      placeholder.isFilled = true;

      return { snapped: true };
    }

    let nearbyMismatch = false;
    for (const p of this.placeholders) {
      const checkY = item.y;

      const dist = Phaser.Math.Distance.Between(
        item.x,
        checkY,
        p.area.centerX,
        p.area.centerY,
      );
      if (dist < 150) {
        nearbyMismatch = true;
        break;
      }
    }

    if (nearbyMismatch) {
      const payload = item.getData("payload");
      return { snapped: false, mismatch: true, payload };
    }

    return { snapped: false };
  }

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
      this.placeholders = this.placeholders.filter(
        (item) => item.instanceId !== instanceId,
      );
    }
  }
  public checkCategoryCompletion(type: InteractableType): boolean {
    const categoryPlaceholders = this.placeholders.filter(
      (p) => p.type === type,
    );
    if (categoryPlaceholders.length === 0) return true;

    return categoryPlaceholders.every((p) => p.isFilled);
  }
}
