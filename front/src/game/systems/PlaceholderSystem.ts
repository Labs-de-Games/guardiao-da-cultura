import * as Phaser from "phaser";
import { LayoutConfig } from "../constants/LayoutConfig";
import type { CarryableItem } from "../objects/interactives/CarryableItem";
import type { DraggableItem } from "../objects/interactives/DraggableItem";
import { InteractiveType } from "../types/InteractiveTypes";
import { TiledUtils } from "../utils/TiledUtils";

export interface PlaceholderInstance {
  area: Phaser.Geom.Rectangle;
  instanceId: string;
  type: InteractiveType;
  id: string | string[];
  state?: Record<string, unknown>;
  hintSprite?: Phaser.GameObjects.Sprite;
  isFilled?: boolean;
  placeholderImage?: string;
}

export interface PlaceholderConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  instanceId: string;
  type: InteractiveType;
  id: string | string[];
  state?: Record<string, unknown>;
  placeholderImage?: string;
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
      const placeholderImageStr = TiledUtils.getProperty(
        obj,
        "placeholderImage",
      );
      const targetId = TiledUtils.parseTargetIds(rawProp);
      const scaled = TiledUtils.scaleCoords(obj, scale);

      this.registerPlaceholder({
        x: scaled.x,
        y: scaled.y,
        width: scaled.width,
        height: scaled.height,
        instanceId: obj.name || Phaser.Math.RND.uuid(),
        type: typeStr as InteractiveType,
        id: targetId,
        state:
          typeStr === InteractiveType.PHOTO
            ? { filledSlots: [null, null, null, null] }
            : {},
        placeholderImage: placeholderImageStr as string,
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
      placeholderImage: config.placeholderImage,
    };

    let textureKey = "placeholder";
    if (config.placeholderImage) {
      if (["1", "2", "3"].includes(String(config.placeholderImage))) {
        textureKey = `placeholder-${config.placeholderImage}`;
      } else {
        textureKey = config.placeholderImage;
      }
    }

    const placeholder = this.scene.add.sprite(
      rect.centerX,
      rect.centerY,
      textureKey,
      0,
    );
    let scale = 0.1;
    switch (config.type) {
      case InteractiveType.SCULPTURE:
        scale = 1.2;
        break;
      case InteractiveType.PAINTING:
        scale = 0.1;
        break;
      case InteractiveType.PHOTO:
        scale = 0.1;
        break;
    }
    placeholder.setScale(scale);
    placeholder.setAlpha(0.45);
    placeholder.setDepth(10);

    if (
      textureKey === "placeholder" &&
      this.scene.anims.exists("placeholder_hint_anim")
    ) {
      placeholder.play("placeholder_hint_anim", true);
    }

    instance.hintSprite = placeholder;
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
        if (item.interactiveType !== p.type) continue;

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
    placeholder?: PlaceholderInstance | null;
  } {
    const placeholder = this.isOverPlaceholder(item.x, item.y, item);

    if (placeholder) {
      item.x = placeholder.area.centerX;

      if (item.interactiveType !== InteractiveType.SCULPTURE) {
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
      return {
        snapped: false,
        mismatch: true,
        placeholder: this.getNearbyPlaceholder(item.x, item.y, 150),
      };
    }

    return { snapped: false };
  }

  public getNearbyPlaceholder(
    x: number,
    y: number,
    maxDistance: number = 100,
    type?: InteractiveType,
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
      p.isFilled = true;
    }
  }
  public checkCategoryCompletion(type: InteractiveType): boolean {
    const categoryPlaceholders = this.placeholders.filter(
      (p) => p.type === type,
    );
    if (categoryPlaceholders.length === 0) return true;

    return categoryPlaceholders.every((p) => p.isFilled);
  }
}
