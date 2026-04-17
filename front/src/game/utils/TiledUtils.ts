import type * as Phaser from "phaser";

/**
 * Utility class to handle Tiled object data extraction and transformation.
 */
export class TiledUtils {
  /**
   * Safely gets a property from a Tiled object's properties array.
   * Handles both Array and Object formats of Tiled properties.
   */
  public static getProperty(
    obj: Phaser.Types.Tilemaps.TiledObject,
    name: string,
  ): any {
    if (!obj.properties) return undefined;

    if (Array.isArray(obj.properties)) {
      const prop = obj.properties.find((p: any) => p.name === name);
      return prop ? prop.value : undefined;
    }

    // Fallback for cases where properties is a plain object
    return (obj.properties as any)[name];
  }

  /**
   * Gets a property and ensures it's treated as a boolean.
   */
  public static getBoolProperty(
    obj: Phaser.Types.Tilemaps.TiledObject,
    name: string,
  ): boolean {
    const val = TiledUtils.getProperty(obj, name);
    return val === true || val === "true";
  }

  /**
   * Scales all positional and dimensional properties of a Tiled object.
   */
  public static scaleCoords(
    obj: Phaser.Types.Tilemaps.TiledObject,
    scale: number,
  ) {
    return {
      x: (obj.x || 0) * scale,
      y: (obj.y || 0) * scale,
      width: (obj.width || 0) * scale,
      height: (obj.height || 0) * scale,
    };
  }
}
