import type * as Phaser from "phaser";

export type TiledPropertyValue = unknown;

export interface TiledProperty {
  name: string;
  type: string;
  value: TiledPropertyValue;
}

export const TiledUtils = {
  parseTargetIds(rawProp: unknown): string | string[] {
    if (!rawProp) return "";

    if (Array.isArray(rawProp)) {
      return rawProp
        .map((item) => {
          if (item && typeof item === "object") {
            return String(item.value || item.id || item.name || "");
          }
          return String(item);
        })
        .filter((s) => s !== "");
    }

    const targetIdRaw =
      typeof rawProp === "object"
        ? String(
            (rawProp as { value?: string; id?: string }).value ||
              (rawProp as { value?: string; id?: string }).id ||
              "",
          )
        : String(rawProp);

    return targetIdRaw.includes(",")
      ? targetIdRaw.split(",").map((s: string) => s.trim())
      : targetIdRaw;
  },
  getProperty(obj: Phaser.Types.Tilemaps.TiledObject, name: string): unknown {
    if (!obj.properties) return undefined;

    if (Array.isArray(obj.properties)) {
      const prop = obj.properties.find(
        (p: Record<string, unknown>) => p.name === name,
      );
      return prop ? prop.value : undefined;
    }

    return (obj.properties as Record<string, unknown>)[name];
  },

  getBoolProperty(
    obj: Phaser.Types.Tilemaps.TiledObject,
    name: string,
  ): boolean {
    const val = TiledUtils.getProperty(obj, name);
    return val === true || val === "true";
  },

  scaleCoords(obj: Phaser.Types.Tilemaps.TiledObject, scale: number) {
    return {
      x: (obj.x || 0) * scale,
      y: (obj.y || 0) * scale,
      width: (obj.width || 0) * scale,
      height: (obj.height || 0) * scale,
    };
  },
};
