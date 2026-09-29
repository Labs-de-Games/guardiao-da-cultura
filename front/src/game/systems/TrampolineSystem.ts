import type * as Phaser from "phaser";
import { LayoutConfig } from "../constants/LayoutConfig";
import { Trampoline } from "../objects/Trampoline";
import { TiledUtils } from "../utils/TiledUtils";

/** Power multiplier used when a Tiled object omits the "power" property. */
const DEFAULT_TRAMPOLINE_POWER = 1.5;

export class TrampolineSystem {
  private trampolines: Trampoline[] = [];
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Registers all objects from a Tiled "Trampoline" object layer. Each
  // object may define a numeric "power" custom property: a multiplier
  // against the player's base jump velocity (e.g. 1.5 = 1.5x a normal jump).
  public registerAllFromLayer(
    layer: Phaser.Tilemaps.ObjectLayer,
    scale: number = LayoutConfig.GAME.MAP_SCALE,
  ): void {
    if (!layer?.objects) return;

    layer.objects.forEach((obj) => {
      const rawPower = TiledUtils.getProperty(obj, "power");
      const scaled = TiledUtils.scaleCoords(obj, scale);

      const trampoline = new Trampoline(this.scene, {
        x: scaled.x,
        y: scaled.y,
        power:
          rawPower !== undefined ? Number(rawPower) : DEFAULT_TRAMPOLINE_POWER,
        scale,
      });

      this.trampolines.push(trampoline);
    });
  }

  public getAll(): Trampoline[] {
    return this.trampolines;
  }

  public destroy(): void {
    this.trampolines.forEach((t) => {
      t.destroy();
    });
    this.trampolines = [];
  }
}
