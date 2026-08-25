import * as Phaser from "phaser";
import type { EffectsManager } from "../objects/EffectsManager";
import { TiledUtils } from "../utils/TiledUtils";

export interface SpotlightInstance {
  id: string;
  color: string;
  isCorrect: boolean;
  sprite: Phaser.GameObjects.Sprite;
  area: Phaser.Geom.Rectangle;
  isOn: boolean;
  isLocked: boolean;
}

export class SpotlightSystem {
  private scene: Phaser.Scene;
  private effects: EffectsManager;
  private spotlights: SpotlightInstance[] = [];
  private activeSpotlight: SpotlightInstance | null = null;

  private static COLOR_MAP: Record<string, number> = {
    red: 0xff4444,
    green: 0x44ff44,
    blue: 0x4444ff,
    yellow: 0xffff44,
  };

  constructor(scene: Phaser.Scene, effects: EffectsManager) {
    this.scene = scene;
    this.effects = effects;
    this.effects.initPersistentCone();
  }

  public registerAllFromLayer(layer: Phaser.Tilemaps.ObjectLayer) {
    const objects = layer.objects;

    for (const obj of objects) {
      if (obj.type !== "SpotlightInstance") continue;

      const color = TiledUtils.getProperty(obj, "spotlightColor") as string;
      const isCorrect = TiledUtils.getBoolProperty(obj, "correctColor");
      const scale = (TiledUtils.getProperty(obj, "scale") as number) || 1;
      const coords = TiledUtils.scaleCoords(obj, scale);

      const sprite = this.scene.add.sprite(
        coords.x,
        coords.y,
        `spotlight-off-${color}`,
      );
      sprite.setOrigin(0.5, 1);
      sprite.setScale(scale);
      sprite.setDepth(19);

      const width = (obj.width || 64) * scale;
      const height = (obj.height || 128) * scale;
      const area = new Phaser.Geom.Rectangle(
        coords.x - width / 2,
        coords.y - height,
        width,
        height,
      );

      const spotlight: SpotlightInstance = {
        id: (obj.name as string) || `spotlight_${color}`,
        color,
        isCorrect,
        sprite,
        area,
        isOn: false,
        isLocked: false,
      };

      this.spotlights.push(spotlight);
    }
  }

  public getAll(): SpotlightInstance[] {
    return this.spotlights;
  }

  public getActiveSpotlight(): SpotlightInstance | null {
    return this.activeSpotlight;
  }

  public activateSpotlight(spotlight: SpotlightInstance): boolean {
    if (spotlight.isLocked) return false;

    if (this.activeSpotlight && this.activeSpotlight !== spotlight) {
      if (this.activeSpotlight.isLocked) return false;
      this.deactivateSpotlight(this.activeSpotlight);
    }

    if (spotlight.isOn) {
      if (spotlight.isLocked) return false;
      this.deactivateSpotlight(spotlight);
      return false;
    }

    spotlight.isOn = true;
    this.activeSpotlight = spotlight;
    this.updateSpriteTexture(spotlight);
    this.drawCone(spotlight);
    return true;
  }

  public lockAll() {
    for (const s of this.spotlights) {
      s.isLocked = true;
    }
  }

  private deactivateSpotlight(spotlight: SpotlightInstance) {
    spotlight.isOn = false;
    if (this.activeSpotlight === spotlight) {
      this.activeSpotlight = null;
    }
    this.updateSpriteTexture(spotlight);
    this.clearCone();
  }

  private updateSpriteTexture(spotlight: SpotlightInstance) {
    const textureKey = spotlight.isOn
      ? `spotlight-${spotlight.color}`
      : `spotlight-off-${spotlight.color}`;
    spotlight.sprite.setTexture(textureKey);
  }

  private drawCone(spotlight: SpotlightInstance) {
    const color = SpotlightSystem.COLOR_MAP[spotlight.color] || 0xffffff;
    const px = spotlight.sprite.x;
    const py = spotlight.sprite.y;
    this.effects.showPersistentCone(px, py + 459, color);
  }

  private clearCone() {
    this.effects.hidePersistentCone();
  }

  public getCategoryProgress(): { filled: number; total: number } {
    const hasActive = this.activeSpotlight !== null ? 1 : 0;
    return { filled: hasActive, total: 1 };
  }

  public getNearbySpotlight(
    playerX: number,
    playerY: number,
    distance: number,
  ): SpotlightInstance | null {
    let closest: SpotlightInstance | null = null;
    let closestDist = Infinity;

    for (const s of this.spotlights) {
      if (s.isLocked) continue;
      const dx = playerX - s.sprite.x;
      const dy = playerY - s.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < distance && dist < closestDist) {
        closest = s;
        closestDist = dist;
      }
    }

    return closest;
  }

  public getNearestIncomplete(
    playerX: number,
    playerY: number,
    radius: number,
  ): SpotlightInstance | null {
    return this.getNearbySpotlight(playerX, playerY, radius);
  }

  public pulseNearestSpotlight(
    playerX: number,
    playerY: number,
    radius: number = 300,
  ): void {
    const spotlight = this.getNearestIncomplete(playerX, playerY, radius);
    if (!spotlight) return;

    const sprite = spotlight.sprite;
    if (this.scene.tweens.isTweening(sprite)) return;

    this.scene.tweens.add({
      targets: sprite,
      alpha: { from: 0.45, to: 1 },
      duration: 500,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut",
      onComplete: () => {
        sprite.setAlpha(1);
      },
    });
  }
}
