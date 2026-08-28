import * as Phaser from "phaser";
import { LayoutConfig } from "../constants/LayoutConfig";
import { canUseLighting, parseColor } from "../utils/lightUtils";
import { TiledUtils } from "../utils/TiledUtils";

export interface ChandelierLightInstance {
  instanceId: string;
  x: number;
  y: number;
  light?: Phaser.GameObjects.Light;
}

export interface ChandelierLightConfig {
  x: number;
  y: number;
  instanceId: string;
  radius?: number;
  color?: number;
  intensity?: number;
}

const DEFAULT_CHANDELIER_LIGHT = {
  radius: 320,
  color: 0xffcc88,
  intensity: 3,
};

export class ChandelierLightSystem {
  private chandelierLights: ChandelierLightInstance[] = [];
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Registers all objects from a Tiled Chandeliers object layer.
  public registerAllFromLayer(
    layer: Phaser.Tilemaps.ObjectLayer,
    scale: number = LayoutConfig.GAME.MAP_SCALE,
  ): void {
    if (!layer?.objects) return;

    layer.objects.forEach((obj) => {
      const rawRadius = TiledUtils.getProperty(obj, "radius");
      const rawColor = TiledUtils.getProperty(obj, "color");
      const rawIntensity = TiledUtils.getProperty(obj, "intensity");
      const scaled = TiledUtils.scaleCoords(obj, scale);

      this.registerChandelierLight({
        x: scaled.x,
        y: scaled.y,
        instanceId: obj.name || Phaser.Math.RND.uuid(),
        radius: rawRadius !== undefined ? Number(rawRadius) : undefined,
        color: rawColor !== undefined ? parseColor(rawColor) : undefined,
        intensity:
          rawIntensity !== undefined ? Number(rawIntensity) : undefined,
      });
    });
  }

  // Registers a single chandelier light at the specified position.
  public registerChandelierLight(
    config: ChandelierLightConfig,
  ): ChandelierLightInstance {
    const light = this.createPointLight(config);

    const instance: ChandelierLightInstance = {
      instanceId: config.instanceId,
      x: config.x,
      y: config.y,
      light,
    };

    this.chandelierLights.push(instance);
    return instance;
  }

  private createPointLight(
    config: ChandelierLightConfig,
  ): Phaser.GameObjects.Light | undefined {
    if (!canUseLighting(this.scene)) return undefined;

    const radius = config.radius ?? DEFAULT_CHANDELIER_LIGHT.radius;
    const color = config.color ?? DEFAULT_CHANDELIER_LIGHT.color;
    const intensity = config.intensity ?? DEFAULT_CHANDELIER_LIGHT.intensity;

    // Omnidirectional — coneEnabled stays false (the Light default).
    return this.scene.lights.addLight(
      config.x,
      config.y,
      radius,
      color,
      intensity,
    );
  }

  // Gets all registered chandelier lights.
  public getAll(): ChandelierLightInstance[] {
    return this.chandelierLights;
  }

  // Destroys all chandelier lights and cleans up.
  public destroy(): void {
    this.chandelierLights = [];
  }
}
