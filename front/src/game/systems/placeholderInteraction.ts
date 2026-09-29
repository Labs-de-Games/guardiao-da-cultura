import { InteractiveType } from "../types/InteractiveTypes";

export interface InteractionConfig {
  range: number;
  anchor: "center" | "bottom";
  hintOffsetY?: number;
}

export const DEFAULT_INTERACTION: InteractionConfig = {
  range: 120,
  anchor: "center",
};

export const INTERACTION_BY_TYPE: Partial<
  Record<InteractiveType, InteractionConfig>
> = {
  [InteractiveType.STEP_SEQUENCE]: {
    range: 320,
    anchor: "bottom",
    hintOffsetY: 220,
  },
};

export function getInteractionConfig(type: InteractiveType): InteractionConfig {
  return INTERACTION_BY_TYPE[type] ?? DEFAULT_INTERACTION;
}

export interface InteractionArea {
  centerX: number;
  centerY: number;
  top: number;
  height: number;
}

export interface SpriteMetrics {
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
  originX: number;
  originY: number;
}

export interface InteractionPoint {
  x: number;
  y: number;
  top: number;
  height: number;
}

export function resolveInteractionPoint(
  area: InteractionArea,
  spriteMetrics: SpriteMetrics | undefined,
  type: InteractiveType,
): InteractionPoint {
  const config = getInteractionConfig(type);

  if (config.anchor === "bottom" && spriteMetrics) {
    const top =
      spriteMetrics.y - spriteMetrics.displayHeight * spriteMetrics.originY;
    const bottom = top + spriteMetrics.displayHeight;
    return {
      x: spriteMetrics.x,
      y: bottom,
      top,
      height: spriteMetrics.displayHeight,
    };
  }

  return {
    x: area.centerX,
    y: area.centerY,
    top: area.top,
    height: area.height,
  };
}
