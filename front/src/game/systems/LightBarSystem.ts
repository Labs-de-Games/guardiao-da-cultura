import * as Phaser from "phaser";
import { AudioManager } from "../audio";
import { LayoutConfig } from "../constants/LayoutConfig";
import {
  canUseLighting,
  DEFAULT_CONE_ROTATION,
  parseColor,
} from "../utils/lightUtils";
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
  isBroken: boolean;
  sparkTimer?: Phaser.Time.TimerEvent;
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
  // When set, the cone light starts off and only turns on once the
  // linked placeholder (by its Tiled object name, e.g. "PH_3") is
  // correctly filled.
  placeholderId?: string;
  // When true, the light bar continuously emits irregular spark bursts
  // to read as a malfunctioning/broken electrical fixture. Independent
  // from isOn/placeholder state.
  isBroken?: boolean;
}

const DEFAULT_CONE_LIGHT = {
  radius: 420,
  color: 0xffcc88,
  intensity: 6,
  angleDeg: 30,
};

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
      const placeholderId = TiledUtils.getProperty(obj, "placeholderId");
      const rawIsBroken = TiledUtils.getProperty(obj, "is_broken");
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
        placeholderId: placeholderId as string | undefined,
        isBroken: rawIsBroken === true,
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
    // TintModes.FILL (not the default MULTIPLY) because light_bar.png is
    // a near-black silhouette: multiply-tint keeps existing pixel color,
    // which stays ~black regardless of tint value. FILL replaces the
    // color outright, respecting only the texture's alpha shape.
    // Future "fixed" state hook: sprite.setTintMode(Phaser.TintModes.MULTIPLY)
    // (or clearTint()) restores normal color.
    if (config.isBroken) {
      sprite.setTint(LightBarSystem.BROKEN_TINT);
      sprite.setTintMode(Phaser.TintModes.FILL);
    }

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
      isBroken: !!config.isBroken,
    };

    if (config.isBroken) {
      instance.sparkTimer = this.startSparkLoop(instance);
    }

    this.lightBars.push(instance);
    return instance;
  }

  private static readonly BROKEN_TINT = 0x333333;
  private static readonly SPARK_TEXTURE = "light_bar_spark";
  private static readonly SPARK_TEXTURE_SIZE = 6;
  private static readonly SPARK_COLORS = [
    0xfff2b2, 0xffe066, 0xe67300, 0xff0000,
  ];
  private static readonly SPARK_SCALE = { start: 2.5, end: 0 };
  private static readonly SPARK_QUANTITY = { min: 3, max: 8 };
  private static readonly SPARK_SPEED = { min: 80, max: 220 };
  private static readonly SPARK_BURST_INTERVAL = { min: 500, max: 1500 };

  private ensureSparkTexture(): void {
    if (this.scene.textures.exists(LightBarSystem.SPARK_TEXTURE)) return;

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(
      0,
      0,
      LightBarSystem.SPARK_TEXTURE_SIZE,
      LightBarSystem.SPARK_TEXTURE_SIZE,
    );
    graphics.generateTexture(
      LightBarSystem.SPARK_TEXTURE,
      LightBarSystem.SPARK_TEXTURE_SIZE,
      LightBarSystem.SPARK_TEXTURE_SIZE,
    );
    graphics.destroy();
  }

  // Schedules irregular spark bursts to sell a broken/malfunctioning
  // light bar. Runs independently of isOn/placeholder state.
  private startSparkLoop(instance: LightBarInstance): Phaser.Time.TimerEvent {
    const scheduleNext = (): Phaser.Time.TimerEvent =>
      this.scene.time.addEvent({
        delay: Phaser.Math.Between(
          LightBarSystem.SPARK_BURST_INTERVAL.min,
          LightBarSystem.SPARK_BURST_INTERVAL.max,
        ),
        callback: () => {
          this.explodeSparks(
            instance.x,
            instance.y - 28,
            Phaser.Math.Between(
              LightBarSystem.SPARK_QUANTITY.min,
              LightBarSystem.SPARK_QUANTITY.max,
            ),
          );
          instance.sparkTimer = scheduleNext();
        },
      });

    return scheduleNext();
  }

  private explodeSparks(x: number, y: number, quantity: number): void {
    this.ensureSparkTexture();

    const lifespan = Phaser.Math.Between(100, 300);
    const emitter = this.scene.add.particles(
      x,
      y,
      LightBarSystem.SPARK_TEXTURE,
      {
        speed: LightBarSystem.SPARK_SPEED,
        angle: { min: 0, max: 360 },
        gravityY: 300,
        lifespan,
        scale: LightBarSystem.SPARK_SCALE,
        alpha: { start: 1, end: 0 },
        tint: LightBarSystem.SPARK_COLORS,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      },
    );
    emitter.setDepth(21);
    emitter.explode(quantity);

    this.scene.time.delayedCall(lifespan, () => emitter.destroy());
  }

  private createConeLight(
    config: LightBarConfig,
    intensity: number,
  ): Phaser.GameObjects.Light | undefined {
    if (!canUseLighting(this.scene)) return undefined;

    const radius = config.radius ?? DEFAULT_CONE_LIGHT.radius;
    const color = config.color ?? DEFAULT_CONE_LIGHT.color;
    const angleDeg = config.angleDeg ?? DEFAULT_CONE_LIGHT.angleDeg;
    const angle = (angleDeg * Math.PI) / 180;

    // innerAngle === outerAngle gives a hard cone edge, closest match to
    // the old shader's default falloff behavior (no Tiled property maps
    // to a soft edge today).
    return this.scene.lights.addConeLight(
      config.x,
      config.y - 28,
      radius,
      color,
      intensity,
      DEFAULT_CONE_ROTATION,
      angle,
      angle,
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

  public getByInstanceId(instanceId: string): LightBarInstance | undefined {
    return this.lightBars.find((lb) => lb.instanceId === instanceId);
  }

  // Clears the broken/malfunctioning state: stops the spark loop and
  // restores the original tint. No-op if already fixed.
  public fix(instanceId: string): void {
    const lb = this.getByInstanceId(instanceId);
    if (!lb?.isBroken) return;
    AudioManager.playSfx("sfx.light_bar.fix");
    lb.sparkTimer?.remove();
    lb.sparkTimer = undefined;
    lb.sprite.clearTint();
    lb.isBroken = false;
  }

  // Destroys all light bars and cleans up.
  public destroy(): void {
    this.lightBars.forEach((lightBar) => {
      lightBar.sparkTimer?.remove();
      lightBar.sprite.destroy();
    });
    this.lightBars = [];
  }
}
