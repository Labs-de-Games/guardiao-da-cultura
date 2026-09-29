import { InteractiveType } from "../types/InteractiveTypes";
import {
  DEFAULT_INTERACTION,
  getInteractionConfig,
  resolveInteractionPoint,
} from "./placeholderInteraction";

// PH_2 in level 3: Tiled point (207, 478) * MAP_SCALE 6 => world (1242, 2868).
// A Tiled point object gets a fixed 128px rect centred on the point.
const AREA = { centerX: 1242, centerY: 2868, top: 2804, height: 128 };

describe("resolveInteractionPoint", () => {
  it("anchors bottom-type placeholders to the rendered sprite bottom edge, invariant to scale", () => {
    const scale5 = {
      x: AREA.centerX,
      y: AREA.centerY,
      displayWidth: 590,
      displayHeight: 530,
      originX: 0.5,
      originY: 0.5,
    };
    const scale3 = {
      x: AREA.centerX,
      y: AREA.centerY,
      displayWidth: 354,
      displayHeight: 318,
      originX: 0.5,
      originY: 0.5,
    };

    const point5 = resolveInteractionPoint(
      AREA,
      scale5,
      InteractiveType.STEP_SEQUENCE,
    );
    const point3 = resolveInteractionPoint(
      AREA,
      scale3,
      InteractiveType.STEP_SEQUENCE,
    );

    expect(point5.y).toBe(
      scale5.y + scale5.displayHeight * (1 - scale5.originY),
    );
    expect(point3.y).toBe(
      scale3.y + scale3.displayHeight * (1 - scale3.originY),
    );
    expect(point5.x).toBe(AREA.centerX);
    expect(point3.x).toBe(AREA.centerX);
  });

  it("shifts the point when the sprite carries a yOffset", () => {
    const withoutOffset = resolveInteractionPoint(
      AREA,
      {
        x: AREA.centerX,
        y: AREA.centerY,
        displayWidth: 590,
        displayHeight: 530,
        originX: 0.5,
        originY: 0.5,
      },
      InteractiveType.STEP_SEQUENCE,
    );
    const withOffset = resolveInteractionPoint(
      AREA,
      {
        x: AREA.centerX,
        y: AREA.centerY + 50,
        displayWidth: 590,
        displayHeight: 530,
        originX: 0.5,
        originY: 0.5,
      },
      InteractiveType.STEP_SEQUENCE,
    );

    expect(withOffset.y).toBe(withoutOffset.y + 50);
  });

  it("falls back to the area centre when the sprite is missing", () => {
    const point = resolveInteractionPoint(
      AREA,
      undefined,
      InteractiveType.STEP_SEQUENCE,
    );

    expect(point.x).toBe(AREA.centerX);
    expect(point.y).toBe(AREA.centerY);
    expect(point.top).toBe(AREA.top);
    expect(point.height).toBe(AREA.height);
  });

  it("resolves a type with no table entry to the default centre config", () => {
    expect(getInteractionConfig(InteractiveType.PHOTO)).toEqual(
      DEFAULT_INTERACTION,
    );

    const point = resolveInteractionPoint(
      AREA,
      {
        x: AREA.centerX,
        y: AREA.centerY,
        displayWidth: 590,
        displayHeight: 530,
        originX: 0.5,
        originY: 0.5,
      },
      InteractiveType.PHOTO,
    );
    expect(point.x).toBe(AREA.centerX);
    expect(point.y).toBe(AREA.centerY);
  });

  describe("PH_2 regression: reachable from the rendered artwork, not the point centre", () => {
    const sprite = {
      x: AREA.centerX,
      y: AREA.centerY,
      displayWidth: 590,
      displayHeight: 530,
      originX: 0.5,
      originY: 0.5,
    };
    const point = resolveInteractionPoint(
      AREA,
      sprite,
      InteractiveType.STEP_SEQUENCE,
    );
    const stepSequenceConfig = getInteractionConfig(
      InteractiveType.STEP_SEQUENCE,
    );

    it("is in range for feet standing at the floor, unlike the old 120/centre rule", () => {
      const feet = { x: 1242, y: 3072 };

      const newDist = Math.hypot(feet.x - point.x, feet.y - point.y);
      expect(newDist).toBeLessThan(stepSequenceConfig.range);

      const oldDist = Math.hypot(feet.x - AREA.centerX, feet.y - AREA.centerY);
      expect(oldDist).toBeGreaterThanOrEqual(DEFAULT_INTERACTION.range);
    });

    it("reaches horizontally to about the width of the artwork", () => {
      const feetY = 3072;

      const passDist = Math.hypot(295, feetY - point.y);
      expect(passDist).toBeLessThan(stepSequenceConfig.range);

      const failDist = Math.hypot(340, feetY - point.y);
      expect(failDist).toBeGreaterThan(stepSequenceConfig.range);
    });
  });
});
