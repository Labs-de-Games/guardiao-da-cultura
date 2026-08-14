import * as Phaser from "phaser";
import { LayoutConfig } from "../constants/LayoutConfig";
import type { ConeLightPipeline } from "../pipelines/ConeLightPipeline";
import { TiledUtils } from "../utils/TiledUtils";

export interface LightBarInstance {
  sprite: Phaser.GameObjects.Sprite;
  instanceId: string;
  x: number;
  y: number;
  placeholderId?: string;
  light?: Phaser.GameObjects.Light;
  targetIntensity: number;
  isOn: boolean;
}

export interface LightBarConfig {
  x: number;
  y: number;
  instanceId: string;
  texture?: string;
  scale?: number;
  radius?: number;
  color?: number;
  intensity?: number;
  angleDeg?: number;
  falloff?: number;
  // When set, the cone light starts off and only turns on once the
  // linked placeholder (by its Tiled object name, e.g. "PH_3") is
  // correctly filled.
  placeholderId?: string;
}

const DEFAULT_CONE_LIGHT = {
  radius: 420,
  color: 0xffcc88,
  intensity: 6,
  angleDeg: 30,
};

// Accepts a numeric color, or a hex string such as "#ffcc88", "0xffcc88",
// or Tiled's native "#AARRGGBB" color property format.
function parseColor(raw: unknown): number {
  if (typeof raw === "number") return raw;

  const hex = String(raw).trim().replace(/^#/, "").replace(/^0x/i, "");
  const rgbHex = hex.length === 8 ? hex.slice(2) : hex;
  const parsed = Number.parseInt(rgbHex, 16);

  return Number.isNaN(parsed) ? DEFAULT_CONE_LIGHT.color : parsed;
}

export class LightBarSystem {
  private lightBars: LightBarInstance[] = [];
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Registers all objects from a Tiled LightBars object layer.
  public registerAllFromLayer(
    layer: Phaser.Tilemaps.ObjectLayer,
    scale: number = LayoutConfig.GAME.MAP_SCALE,
  ): void {
    if (!layer?.objects) return;

    layer.objects.forEach((obj) => {
      const texture = TiledUtils.getProperty(obj, "texture");
      const rawScale = TiledUtils.getProperty(obj, "scale");
      const rawRadius = TiledUtils.getProperty(obj, "radius");
      const rawColor = TiledUtils.getProperty(obj, "color");
      const rawIntensity = TiledUtils.getProperty(obj, "intensity");
      const rawAngleDeg = TiledUtils.getProperty(obj, "angle");
      const rawFalloff = TiledUtils.getProperty(obj, "falloff");
      const placeholderId = TiledUtils.getProperty(obj, "placeholderId");
      const scaled = TiledUtils.scaleCoords(obj, scale);

      this.registerLightBar({
        x: scaled.x,
        y: scaled.y,
        instanceId: obj.name || Phaser.Math.RND.uuid(),
        texture: texture as string | undefined,
        scale: rawScale !== undefined ? Number(rawScale) : undefined,
        radius: rawRadius !== undefined ? Number(rawRadius) : undefined,
        color: rawColor !== undefined ? parseColor(rawColor) : undefined,
        intensity:
          rawIntensity !== undefined ? Number(rawIntensity) : undefined,
        angleDeg: rawAngleDeg !== undefined ? Number(rawAngleDeg) : undefined,
        falloff: rawFalloff !== undefined ? Number(rawFalloff) : undefined,
        placeholderId: placeholderId as string | undefined,
      });
    });
  }

  // Registers a single light bar at the specified position.
  public registerLightBar(config: LightBarConfig): LightBarInstance {
    const textureKey = config.texture || "light_bar";
    const sprite = this.scene.add.sprite(config.x, config.y, textureKey);
    sprite.setOrigin(0.5, 1);
    sprite.setScale(config.scale !== undefined ? config.scale : 1);
    sprite.setDepth(19);

    const targetIntensity = config.intensity ?? DEFAULT_CONE_LIGHT.intensity;
    const isOn = !config.placeholderId;
    const light = this.createConeLight(config, isOn ? targetIntensity : 0);

    const instance: LightBarInstance = {
      sprite,
      instanceId: config.instanceId,
      x: config.x,
      y: config.y,
      placeholderId: config.placeholderId,
      light,
      targetIntensity,
      isOn,
    };

    this.lightBars.push(instance);
    return instance;
  }

  private createConeLight(
    config: LightBarConfig,
    intensity: number,
  ): Phaser.GameObjects.Light | undefined {
    if (this.scene.renderer.type !== Phaser.WEBGL) return undefined;

    const renderer = this.scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    const pipeline = renderer.pipelines.get("Conelight") as
      | ConeLightPipeline
      | undefined;
    if (!pipeline) return undefined;

    const radius = config.radius ?? DEFAULT_CONE_LIGHT.radius;
    const color = config.color ?? DEFAULT_CONE_LIGHT.color;
    const angleDeg = config.angleDeg ?? DEFAULT_CONE_LIGHT.angleDeg;
    const angle = (angleDeg * Math.PI) / 180;

    return pipeline.addConeLight(
      this.scene,
      config.x,
      config.y - 28,
      radius,
      color,
      intensity,
      angle,
      config.falloff,
    );
  }

  // Turns on every light bar linked to the given placeholder instance id
  // (e.g. "PH_3"). No-op for light bars that don't reference it.
  public turnOnByPlaceholder(placeholderId: string): void {
    this.lightBars
      .filter((lb) => lb.placeholderId === placeholderId && !lb.isOn)
      .forEach((lb) => {
        lb.isOn = true;
        if (lb.light) lb.light.intensity = lb.targetIntensity;
      });
  }

  // Gets all registered light bars.
  public getAll(): LightBarInstance[] {
    return this.lightBars;
  }

  // Destroys all light bars and cleans up.
  public destroy(): void {
    this.lightBars.forEach((lightBar) => {
      lightBar.sprite.destroy();
    });
    this.lightBars = [];
  }
}
