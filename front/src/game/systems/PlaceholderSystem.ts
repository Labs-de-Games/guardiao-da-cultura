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
  hintSprite?: Phaser.GameObjects.GameObject;
  isFilled?: boolean;
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
  scale?: number;
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
      const rawScale = TiledUtils.getProperty(obj, "scale");
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
        scale: rawScale !== undefined ? Number(rawScale) : undefined,
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

    const primaryId = Array.isArray(config.id) ? config.id[0] : config.id;

    if (config.type === InteractiveType.PHOTO) {
      const cellW = 122;
      const cellH = 80;
      const container = this.scene.add.container(rect.centerX, rect.centerY);

      for (let i = 0; i < 4; i++) {
        const cell = this.scene.add.image(0, 0, "rec");
        cell.setDisplaySize(cellW, cellH);
        cell.setAlpha(0.45);
        const col = i % 2;
        const row = Math.floor(i / 2);
        cell.setPosition(
          col === 0 ? -cellW / 2 : cellW / 2,
          row === 0 ? -cellH / 2 : cellH / 2,
        );
        container.add(cell);
      }
      container.setDepth(10);
      instance.hintSprite = container;
    } else if (config.type === InteractiveType.COSTUME) {
      const { TEXTURES, CELL_W, CELL_H, PART_DEFAULTS } = LayoutConfig.COSTUME;
      const container = this.scene.add.container(rect.centerX, rect.centerY);

      const scale = config.scale ?? 1;
      instance.state = { ...(instance.state || {}), costumeScale: scale };

      const pedestalConfig = LayoutConfig.COSTUME.PEDESTAL_DEFAULT;
      const pedestal = this.scene.add.image(0, 0, "pedestal");
      pedestal.setDisplaySize(
        pedestal.width * pedestalConfig.scale,
        pedestal.height * pedestalConfig.scale,
      );
      pedestal.setOrigin(pedestalConfig.originX, pedestalConfig.originY);
      pedestal.setPosition(0, pedestalConfig.yOffset * scale);
      container.add(pedestal);

      for (let i = 0; i < TEXTURES.length; i++) {
        const partName = TEXTURES[i].replace("dummy_", "") as
          | "head"
          | "torso"
          | "feet";
        const partConfig = PART_DEFAULTS[partName];

        const cell = this.scene.add.image(0, 0, TEXTURES[i]);
        cell.setDisplaySize(cell.width * scale, cell.height * scale);
        cell.setOrigin(partConfig.originX, partConfig.originY);
        cell.setPosition(0, partConfig.yOffset * scale);
        container.add(cell);
      }
      container.setDepth(10);
      instance.hintSprite = container;
    } else {
      let textureKey = "placeholder";
      if (primaryId) {
        textureKey = `${primaryId}_ph`;
      }

      const placeholder = this.scene.add.sprite(
        rect.centerX,
        rect.centerY,
        textureKey,
        0,
      );
      let scale = 1;
      if (config.scale !== undefined && !Number.isNaN(config.scale)) {
        scale = config.scale;
      }
      placeholder.setScale(scale);
      placeholder.setAlpha(0.45);
      placeholder.setDepth(10);

      if (config.type === InteractiveType.PAINTING) {
        placeholder.setOrigin(0.5, 1);
      }

      if (
        textureKey === "placeholder" &&
        this.scene.anims.exists("placeholder_hint_anim")
      ) {
        placeholder.play("placeholder_hint_anim", true);
      }

      instance.hintSprite = placeholder;
    }
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
        if (p.isFilled) continue;
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
        if (placeholder.hintSprite instanceof Phaser.GameObjects.Sprite) {
          placeholder.hintSprite.stop();
        }
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

      return { snapped: true, placeholder };
    }

    let nearbyMismatch = false;
    for (const p of this.placeholders) {
      if (p.isFilled) continue;
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
      if (p.isFilled) continue;
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

  public updatePhotoCell(
    instanceId: string,
    slotIndex: number,
    chunkTextureKey: string,
  ) {
    const p = this.getPlaceholderByInstanceId(instanceId);
    if (!p) return;
    const hint = p.hintSprite;
    if (!(hint instanceof Phaser.GameObjects.Container)) return;
    const cell = hint.getAt(slotIndex);
    if (cell instanceof Phaser.GameObjects.Image) {
      cell.setTexture(chunkTextureKey);
      cell.setDisplaySize(122, 80);
      cell.setAlpha(1);
    }
  }

  public updateCostumePart(
    instanceId: string,
    partType: "head" | "torso" | "feet",
    textureKey: string,
  ) {
    const p = this.getPlaceholderByInstanceId(instanceId);
    if (!p) return;
    const hint = p.hintSprite;
    if (!(hint instanceof Phaser.GameObjects.Container)) return;

    const slotIndex =
      LayoutConfig.COSTUME.TEXTURES.findIndex((t) =>
        t.endsWith(`_${partType}`),
      ) + 1;
    if (slotIndex <= 0) return;

    const cell = hint.getAt(slotIndex);
    if (!(cell instanceof Phaser.GameObjects.Image)) return;

    const scale = (p.state?.costumeScale as number | undefined) ?? 1;
    cell.setTexture(textureKey);
    cell.setDisplaySize(cell.width * scale, cell.height * scale);
  }

  public lockPlaceholder(instanceId: string) {
    const p = this.getPlaceholderByInstanceId(instanceId);
    if (p) {
      if (
        p.type !== InteractiveType.PHOTO &&
        p.type !== InteractiveType.COSTUME &&
        p.hintSprite
      ) {
        if (p.hintSprite instanceof Phaser.GameObjects.Sprite) {
          p.hintSprite.stop();
        }
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

  public getCategoryProgress(type: InteractiveType): {
    filled: number;
    total: number;
  } {
    const categoryPlaceholders = this.placeholders.filter(
      (p) => p.type === type,
    );

    if (type === InteractiveType.PHOTO) {
      const placeholder = categoryPlaceholders[0];
      if (!placeholder) return { filled: 0, total: 0 };
      const filledSlots =
        (placeholder.state?.filledSlots as (string | null)[] | undefined) ?? [];
      const total = filledSlots.length;
      const filled = filledSlots.filter((s) => s !== null).length;
      return { filled, total };
    }

    const total = categoryPlaceholders.length;
    const filled = categoryPlaceholders.filter((p) => p.isFilled).length;
    return { filled, total };
  }
}
