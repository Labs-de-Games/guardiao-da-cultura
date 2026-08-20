import * as Phaser from "phaser";
import type { EffectsManager } from "../objects/EffectsManager";
import type { ConeLightPipeline } from "../pipelines/ConeLightPipeline";
import { TiledUtils } from "../utils/TiledUtils";
import { parseColor } from "./LightBarSystem";

export interface SpotlightInstance {
  id: string;
  color: string;
  isCorrect: boolean;
  sprite: Phaser.GameObjects.Sprite;
  area: Phaser.Geom.Rectangle;
  isOn: boolean;
  isLocked: boolean;
  light?: Phaser.GameObjects.Light;
  lightIntensity?: number;
}

// Spotlights wired to the ConeLightPipeline instead of the
// EffectsManager graphics cone.
const CONE_LIGHT_SPOTLIGHT_IDS = new Set(["SP_0", "SP_1", "SP_2", "SP_3"]);

const DEFAULT_SPOTLIGHT_LIGHT = {
  radius: 2200,
  color: 0xffffff,
  intensity: 5,
  angleDeg: 40,
};

// Pulls the light's origin up behind the fixture sprite, same as
// LightBarSystem, so the cone's tip doesn't float in front of it.
const SPOTLIGHT_LIGHT_Y_OFFSET = -80;

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

      const id = (obj.name as string) || `spotlight_${color}`;
      let light: Phaser.GameObjects.Light | undefined;
      let lightIntensity: number | undefined;

      if (CONE_LIGHT_SPOTLIGHT_IDS.has(id)) {
        const rawRadius = TiledUtils.getProperty(obj, "radius");
        const rawLightColor = TiledUtils.getProperty(obj, "color");
        const rawAngleDeg = TiledUtils.getProperty(obj, "angle");
        const rawIntensity = TiledUtils.getProperty(obj, "intensity");

        lightIntensity =
          rawIntensity !== undefined
            ? Number(rawIntensity)
            : DEFAULT_SPOTLIGHT_LIGHT.intensity;
        light = this.createConeLight(
          coords.x,
          coords.y + SPOTLIGHT_LIGHT_Y_OFFSET,
          {
            radius: rawRadius !== undefined ? Number(rawRadius) : undefined,
            color:
              rawLightColor !== undefined
                ? parseColor(rawLightColor)
                : undefined,
            angleDeg:
              rawAngleDeg !== undefined ? Number(rawAngleDeg) : undefined,
          },
        );
      }

      const spotlight: SpotlightInstance = {
        id,
        color,
        isCorrect,
        sprite,
        area,
        isOn: false,
        isLocked: false,
        light,
        lightIntensity,
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
    this.clearCone(spotlight);
  }

  private updateSpriteTexture(spotlight: SpotlightInstance) {
    const textureKey = spotlight.isOn
      ? `spotlight-${spotlight.color}`
      : `spotlight-off-${spotlight.color}`;
    spotlight.sprite.setTexture(textureKey);
  }

  private drawCone(spotlight: SpotlightInstance) {
    if (spotlight.light) {
      spotlight.light.intensity =
        spotlight.lightIntensity ?? DEFAULT_SPOTLIGHT_LIGHT.intensity;
      return;
    }

    const color = SpotlightSystem.COLOR_MAP[spotlight.color] || 0xffffff;
    const px = spotlight.sprite.x;
    const py = spotlight.sprite.y;
    this.effects.showPersistentCone(px, py + 459, color);
  }

  private clearCone(spotlight: SpotlightInstance) {
    if (spotlight.light) {
      spotlight.light.intensity = 0;
      return;
    }

    this.effects.hidePersistentCone();
  }

  private createConeLight(
    x: number,
    y: number,
    config: { radius?: number; color?: number; angleDeg?: number },
  ): Phaser.GameObjects.Light | undefined {
    if (this.scene.renderer.type !== Phaser.WEBGL) return undefined;

    const renderer = this.scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    const pipeline = renderer.pipelines.get("Conelight") as
      | ConeLightPipeline
      | undefined;
    if (!pipeline) return undefined;

    const radius = config.radius ?? DEFAULT_SPOTLIGHT_LIGHT.radius;
    const color = config.color ?? DEFAULT_SPOTLIGHT_LIGHT.color;
    const angleDeg = config.angleDeg ?? DEFAULT_SPOTLIGHT_LIGHT.angleDeg;
    const angle = (angleDeg * Math.PI) / 180;

    // Spotlights hang above and shine straight down, unlike the
    // sideways-facing default direction used by wall-mounted light bars.
    // diffuse=0 disables the fake-normal shading term so the beam's
    // reach is governed purely by radius/angle — the shaded version
    // fades to near-nothing over long screen distances no matter how
    // big radius gets, which is unusable for a beam meant to travel
    // far down the level.
    return pipeline.addConeLight(
      this.scene,
      x,
      y,
      radius,
      color,
      0,
      angle,
      1.2,
      0,
      -1,
      0,
    );
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
}
