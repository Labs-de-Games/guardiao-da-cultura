import type * as Phaser from "phaser";

/**
 * Utility class to handle Tiled object data extraction and transformation.
 */
export const TiledUtils = {
  /**
   * Safely gets a property from a Tiled object's properties array.
   * Handles both Array and Object formats of Tiled properties.
   */
  getProperty(
    obj: Phaser.Types.Tilemaps.TiledObject,
    name: string,
  ): unknown {
    if (!obj.properties) return undefined;

    if (Array.isArray(obj.properties)) {
      const prop = obj.properties.find((p: Record<string, unknown>) => p.name === name);
      return prop ? prop.value : undefined;
    }

    // Fallback for cases where properties is a plain object
    return (obj.properties as Record<string, unknown>)[name];
  },

  /**
   * Gets a property and ensures it's treated as a boolean.
   */
  getBoolProperty(
    obj: Phaser.Types.Tilemaps.TiledObject,
    name: string,
  ): boolean {
    const val = TiledUtils.getProperty(obj, name);
    return val === true || val === "true";
  },

  /**
   * Scales all positional and dimensional properties of a Tiled object.
   */
  scaleCoords(
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
};
