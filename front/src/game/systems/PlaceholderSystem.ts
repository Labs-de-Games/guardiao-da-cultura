import * as Phaser from "phaser";
import { LayoutConfig } from "../constants/LayoutConfig";
import { CostumeMechanicHandler } from "../mechanics/handlers/CostumeMechanicHandler";
import type { CarryableItem } from "../objects/interactives/CarryableItem";
import type { DraggableItem } from "../objects/interactives/DraggableItem";
import { InteractiveType } from "../types/InteractiveTypes";
import { TiledUtils } from "../utils/TiledUtils";
import {
  getInteractionConfig,
  type InteractionPoint,
  resolveInteractionPoint,
} from "./placeholderInteraction";

const BAND_CONFIRM_Y_OFFSET = 65;

export interface PlaceholderInstance {
  area: Phaser.Geom.Rectangle;
  instanceId: string;
  type: InteractiveType;
  id: string | string[];
  options?: string[];
  state?: Record<string, unknown>;
  hintSprite?: Phaser.GameObjects.GameObject;
  isFilled?: boolean;
  isLocked?: boolean;
  filledTexture?: string;
  filledScale?: number;
  yOffset?: number;
}

export interface PlaceholderConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  instanceId: string;
  type: InteractiveType;
  id: string | string[];
  options?: string[];
  state?: Record<string, unknown>;
  scale?: number;
  texture?: string;
  alpha?: number;
  isLocked?: boolean;
  filledTexture?: string;
  filledScale?: number;
  yOffset?: number;
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
      const customTexture = TiledUtils.getProperty(obj, "texture");
      const rawAlpha = TiledUtils.getProperty(obj, "alpha");
      const filledTexture = TiledUtils.getProperty(obj, "filledTexture");
      const rawFilledScale = TiledUtils.getProperty(obj, "filledScale");
      const rawYOffset = TiledUtils.getProperty(obj, "yOffset");
      const isLocked = TiledUtils.getBoolProperty(obj, "is_locked");
      const targetId = TiledUtils.parseTargetIds(rawProp);
      const rawOptions = TiledUtils.getProperty(obj, "options");
      const parsedOptions = rawOptions
        ? TiledUtils.parseTargetIds(rawOptions)
        : undefined;
      const options = Array.isArray(parsedOptions) ? parsedOptions : undefined;
      const scaled = TiledUtils.scaleCoords(obj, scale);

      this.registerPlaceholder({
        x: scaled.x,
        y: scaled.y,
        width: scaled.width,
        height: scaled.height,
        instanceId: obj.name || Phaser.Math.RND.uuid(),
        type: typeStr as InteractiveType,
        id: targetId,
        options,
        state:
          typeStr === InteractiveType.PHOTO
            ? { filledSlots: [null, null, null, null] }
            : typeStr === InteractiveType.COSTUME
              ? { ...CostumeMechanicHandler.createInitialState() }
              : {},
        scale: rawScale !== undefined ? Number(rawScale) : undefined,
        texture: customTexture as string | undefined,
        alpha: rawAlpha !== undefined ? Number(rawAlpha) : undefined,
        filledTexture: filledTexture as string | undefined,
        filledScale:
          rawFilledScale !== undefined ? Number(rawFilledScale) : undefined,
        yOffset: rawYOffset !== undefined ? Number(rawYOffset) : undefined,
        isLocked,
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
      options: config.options,
      state: config.state || {},
      isFilled: false,
      isLocked: config.isLocked ?? false,
      filledTexture: config.filledTexture,
      filledScale: config.filledScale,
      yOffset: config.yOffset,
    };

    const primaryId = Array.isArray(config.id) ? config.id[0] : config.id;

    if (config.type === InteractiveType.PHOTO) {
      const cellW = 122;
      const cellH = 80;
      const container = this.scene.add.container(
        rect.centerX,
        rect.centerY + (config.yOffset ?? 0),
      );

      for (let i = 0; i < 4; i++) {
        const cell = this.scene.add.image(0, 0, "rec");
        cell.setDisplaySize(cellW, cellH);
        cell.setAlpha(config.alpha !== undefined ? config.alpha : 0.45);
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
      const { TEXTURES, PART_DEFAULTS } = LayoutConfig.COSTUME;
      const container = this.scene.add.container(rect.centerX, rect.centerY);

      const scale = config.scale ?? 1;
      instance.state = { ...(instance.state || {}), costumeScale: scale };

      // Container children are never visited by Game.setupLighting() — it only
      // walks the scene's top-level display list, and Phaser Containers don't
      // support the Lighting component anyway. Enable lighting on each part
      // image directly so costumes react to dynamic lights.
      const isWebGL = this.scene.renderer.type === Phaser.WEBGL;

      const pedestalConfig = LayoutConfig.COSTUME.PEDESTAL_DEFAULT;
      const pedestal = this.scene.add.image(0, 0, "pedestal");
      pedestal.setDisplaySize(
        pedestal.width * pedestalConfig.scale,
        pedestal.height * pedestalConfig.scale,
      );
      pedestal.setOrigin(pedestalConfig.originX, pedestalConfig.originY);
      pedestal.setPosition(0, pedestalConfig.yOffset * scale);
      if (isWebGL) pedestal.setLighting(true);
      container.add(pedestal);

      const cells = TEXTURES.map((textureKey) => {
        const partName = textureKey.replace("dummy_", "") as
          | "head"
          | "torso"
          | "feet";
        const cell = this.scene.add.image(0, 0, textureKey);
        if (isWebGL) cell.setLighting(true);
        return { partName, cell };
      });

      let nextBottomY = Math.round(pedestalConfig.yOffset * scale);
      for (const partName of ["feet", "torso", "head"] as const) {
        const entry = cells.find((c) => c.partName === partName);
        if (!entry) continue;
        const { cell } = entry;
        const partConfig = PART_DEFAULTS[partName];
        const gap = partConfig.gap ?? 0;

        nextBottomY -= gap * scale;
        cell.setDisplaySize(cell.width * scale, cell.height * scale);
        cell.setOrigin(partConfig.originX, 1);
        cell.setPosition(0, Math.round(nextBottomY));
        nextBottomY -= cell.displayHeight;
      }

      for (const { cell } of cells) {
        container.add(cell);
      }
      container.setDepth(10);
      instance.hintSprite = container;
    } else {
      let textureKey = "placeholder";
      if (config.texture) {
        textureKey = config.texture;
      } else if (config.type === InteractiveType.PAINTING) {
        textureKey = "standard_painting_placeholder";
      } else if (config.type === InteractiveType.SCULPTURE) {
        textureKey = "standard_sculpture_placeholder";
      } else if (primaryId) {
        textureKey = `${primaryId}_ph`;
      }

      const placeholder = this.scene.add.sprite(
        rect.centerX,
        rect.centerY + (config.yOffset ?? 0),
        textureKey,
        0,
      );
      let scale = 1;
      if (config.scale !== undefined && !Number.isNaN(config.scale)) {
        scale = config.scale;
      }
      placeholder.setScale(scale);
      placeholder.setAlpha(config.alpha !== undefined ? config.alpha : 0.45);
      placeholder.setDepth(10);

      if (config.type === InteractiveType.PAINTING) {
        placeholder.setOrigin(0.5, 1);
      }

      if (config.type === InteractiveType.GENIUS_SEQUENCE) {
        placeholder.setTint(0x4d4d4d);
      }

      if (
        textureKey === "placeholder" &&
        this.scene.anims.exists("placeholder_hint_anim")
      ) {
        placeholder.play("placeholder_hint_anim", true);
      }

      instance.hintSprite = placeholder;
    }

    if (instance.isLocked) {
      this.setHintSpriteVisible(instance.hintSprite, false);
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
        if (p.isLocked) continue;
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

      if (placeholder.yOffset !== undefined) {
        item.y = placeholder.area.centerY + placeholder.yOffset;
      } else if (item.interactiveType !== InteractiveType.SCULPTURE) {
        item.y = placeholder.area.centerY;
      }

      item.disableInteractive();

      if (placeholder.type === InteractiveType.POSTER) {
        // For posters: destroy the placeholder hint sprite and replace it
        // with the combined (frame + poster) filled texture image.
        if (placeholder.hintSprite) {
          if (placeholder.hintSprite instanceof Phaser.GameObjects.Sprite) {
            placeholder.hintSprite.stop();
          }
          placeholder.hintSprite.destroy();
          placeholder.hintSprite = undefined;
        }

        const filledKey = placeholder.filledTexture ?? `${item.itemId}_placed`;
        const filledSprite = this.scene.add.image(
          placeholder.area.centerX,
          placeholder.area.centerY + (placeholder.yOffset ?? 0),
          filledKey,
        );
        if (placeholder.filledScale !== undefined) {
          filledSprite.setScale(placeholder.filledScale);
        }
        filledSprite.setDepth(10);
        // Placeholder hint sprites have lighting enabled as of
        // Game.setupLighting(), which only runs once at scene start. This
        // replacement sprite is created later, so it needs lighting enabled
        // explicitly to react to dynamic lights.
        if (this.scene.renderer.type === Phaser.WEBGL) {
          filledSprite.setLighting(true);
        }
        placeholder.hintSprite = filledSprite;

        // Hide the carried item — the filled sprite replaces it visually
        item.setVisible(false);
      } else {
        if (placeholder.hintSprite) {
          if (placeholder.hintSprite instanceof Phaser.GameObjects.Sprite) {
            placeholder.hintSprite.stop();
          }
          placeholder.hintSprite.destroy();
          placeholder.hintSprite = undefined;
        }
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
      if (dist < 150 && p.type === item.interactiveType) {
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
      if (p.isLocked) continue;
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

  public getInteractionPoint(p: PlaceholderInstance): InteractionPoint {
    const area = {
      centerX: p.area.centerX,
      centerY: p.area.centerY,
      top: p.area.top,
      height: p.area.height,
    };

    const sprite = p.hintSprite;
    const spriteMetrics =
      sprite instanceof Phaser.GameObjects.Sprite
        ? {
            x: sprite.x,
            y: sprite.y,
            displayWidth: sprite.displayWidth,
            displayHeight: sprite.displayHeight,
            originX: sprite.originX,
            originY: sprite.originY,
          }
        : undefined;

    return resolveInteractionPoint(area, spriteMetrics, p.type);
  }

  public getNearbyInteractable(
    x: number,
    y: number,
    type: InteractiveType,
  ): PlaceholderInstance | null {
    const { range } = getInteractionConfig(type);
    let closest: PlaceholderInstance | null = null;
    let minDist = range;

    for (const p of this.placeholders) {
      if (p.isFilled) continue;
      if (p.type !== type) continue;

      const point = this.getInteractionPoint(p);
      const dist = Phaser.Math.Distance.Between(x, y, point.x, point.y);
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    }
    return closest;
  }

  public getAll(): PlaceholderInstance[] {
    return this.placeholders;
  }

  public getPlaceholderByInstanceId(
    instanceId: string,
  ): PlaceholderInstance | null {
    return this.placeholders.find((p) => p.instanceId === instanceId) || null;
  }

  public unlockByInstanceId(instanceId: string): void {
    const p = this.getPlaceholderByInstanceId(instanceId);
    if (!p) return;
    p.isLocked = false;
    this.setHintSpriteVisible(p.hintSprite, true);
  }

  private setHintSpriteVisible(
    hintSprite: Phaser.GameObjects.GameObject | undefined,
    visible: boolean,
  ): void {
    if (
      hintSprite instanceof Phaser.GameObjects.Sprite ||
      hintSprite instanceof Phaser.GameObjects.Image ||
      hintSprite instanceof Phaser.GameObjects.Container
    ) {
      hintSprite.setVisible(visible);
    }
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

  public updateBandMember(instanceId: string, textureKey: string) {
    const p = this.getPlaceholderByInstanceId(instanceId);
    if (!p || !(p.hintSprite instanceof Phaser.GameObjects.Sprite)) return;
    p.hintSprite.play(`${textureKey}_anim`, true);
    p.hintSprite.setAlpha(1);
    p.hintSprite.y -= BAND_CONFIRM_Y_OFFSET;
  }

  public lockPlaceholder(instanceId: string) {
    const p = this.getPlaceholderByInstanceId(instanceId);
    if (p) {
      if (
        p.type === InteractiveType.GENIUS_SEQUENCE &&
        p.hintSprite instanceof Phaser.GameObjects.Sprite
      ) {
        p.hintSprite.setAlpha(1);
        p.hintSprite.clearTint();
        p.hintSprite.play("accordion_open_anim", true);
      } else if (
        p.type !== InteractiveType.PHOTO &&
        p.type !== InteractiveType.COSTUME &&
        p.type !== InteractiveType.STEP_SEQUENCE &&
        p.type !== InteractiveType.BAND &&
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

  public pulseNearestPlaceholder(
    x: number,
    y: number,
    radius: number = 300,
    type?: InteractiveType,
  ): void {
    const placeholder = this.getNearbyPlaceholder(x, y, radius, type);
    if (!placeholder) return;

    const sprite = placeholder.hintSprite;
    if (!sprite) return;

    const targets: (Phaser.GameObjects.Sprite | Phaser.GameObjects.Image)[] =
      [];

    if (sprite instanceof Phaser.GameObjects.Container) {
      for (const child of sprite.getAll()) {
        if (
          child instanceof Phaser.GameObjects.Sprite ||
          child instanceof Phaser.GameObjects.Image
        ) {
          targets.push(child);
        }
      }
    } else if (
      sprite instanceof Phaser.GameObjects.Sprite ||
      sprite instanceof Phaser.GameObjects.Image
    ) {
      targets.push(sprite);
    }

    if (targets.length === 0) return;

    const alreadyTweening = targets.some((t) =>
      this.scene.tweens.isTweening(t),
    );
    if (alreadyTweening) return;

    for (const target of targets) {
      const originalAlpha = target.alpha;
      const pulseAlpha =
        originalAlpha >= 0.6
          ? originalAlpha * 0.5
          : Math.min(originalAlpha + 0.25, 1);

      this.scene.tweens.add({
        targets: target,
        alpha: { from: originalAlpha, to: pulseAlpha },
        duration: 500,
        yoyo: true,
        repeat: 2,
        ease: "Sine.easeInOut",
        onComplete: () => {
          target.setAlpha(originalAlpha);
        },
      });
    }
  }
}
