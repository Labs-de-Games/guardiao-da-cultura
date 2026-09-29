import type * as Phaser from "phaser";
import {
  buildRidgeColumns,
  CLOUD_STAMPS,
  CLOUD_STAMPS_NEAR,
  MOUNTAIN_RIDGE,
  MOUNTAIN_RIDGE_NEAR,
  type MountainRidgeConfig,
  PARALLAX_LAYERS,
  Phase3Parallax,
  ridgeTopAt,
} from "./Phase3Parallax";

/** Read the configured rate rather than duplicating it, so tuning is free. */
const rateOf = (id: string) =>
  PARALLAX_LAYERS.find((layer) => layer.id === id)?.factorX ?? 0;

const VIEWPORT_W = 1920;
const VIEWPORT_H = 1080;
const WORLD_W = 4800;
const WORLD_H = 3168;

/** Matches the constants inside Phase3Parallax. */
const BAND_HEIGHT = 320;
const ART_SCALE = 4;
const HEADROOM = BAND_HEIGHT * ART_SCALE - VIEWPORT_H; // 200px of spare sky

const SKY = "phase3_sky";
const CLOUD_SPRITE = "phase3_cloud";
const CLOUDS_BAND = "phase3_clouds_band";
const CLOUDS_NEAR_BAND = "phase3_clouds_near_band";
const CLOUDS_PLACEHOLDER = "phase3_clouds_placeholder";
const CLOUDS_NEAR_PLACEHOLDER = "phase3_clouds_near_placeholder";
const MOUNTAINS = "phase3_mountains";
const MOUNTAINS_PLACEHOLDER = "phase3_mountains_placeholder";
const MOUNTAINS_NEAR = "phase3_mountains_near";
const MOUNTAINS_NEAR_PLACEHOLDER = "phase3_mountains_near_placeholder";

type TileSpriteMock = {
  key: string;
  depth: number;
  scrollFactorX: number;
  scrollFactorY: number;
  tileScaleX: number;
  tileScaleY: number;
  tilePositionX: number;
  tilePositionY: number;
  width: number;
  height: number;
  destroyed: boolean;
  setOrigin: jest.Mock;
  setScrollFactor: jest.Mock;
  setDepth: jest.Mock;
  setTileScale: jest.Mock;
  destroy: jest.Mock;
};

function createTileSpriteMock(
  width: number,
  height: number,
  key: string,
): TileSpriteMock {
  const sprite: TileSpriteMock = {
    key,
    width,
    height,
    depth: 0,
    scrollFactorX: 1,
    scrollFactorY: 1,
    tileScaleX: 1,
    tileScaleY: 1,
    tilePositionX: 0,
    tilePositionY: 0,
    destroyed: false,
    setOrigin: jest.fn(() => sprite),
    setScrollFactor: jest.fn((x: number, y: number) => {
      sprite.scrollFactorX = x;
      sprite.scrollFactorY = y;
      return sprite;
    }),
    setDepth: jest.fn((depth: number) => {
      sprite.depth = depth;
      return sprite;
    }),
    setTileScale: jest.fn((x: number, y: number) => {
      sprite.tileScaleX = x;
      sprite.tileScaleY = y;
      return sprite;
    }),
    destroy: jest.fn(() => {
      sprite.destroyed = true;
    }),
  };
  return sprite;
}

function createGraphicsMock() {
  const graphics = {
    fillStyle: jest.fn(() => graphics),
    fillRect: jest.fn(() => graphics),
    fillPoints: jest.fn(() => graphics),
    fillEllipse: jest.fn(() => graphics),
    generateTexture: jest.fn(() => graphics),
    destroy: jest.fn(),
  };
  return graphics;
}

function createContextMock() {
  const context = {
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    drawImage: jest.fn(),
    imageSmoothingEnabled: true,
    globalAlpha: 1,
  };
  return context;
}

type HarnessOptions = {
  /** Textures already loaded when create() runs. The sky is present by default. */
  available?: string[];
  /** Source size reported for the single cloud sprite. */
  cloudSize?: { width: number; height: number };
};

function createHarness(options: HarnessOptions = {}) {
  const { available = [SKY], cloudSize = { width: 64, height: 24 } } = options;

  const sprites: TileSpriteMock[] = [];
  const graphicsMocks: ReturnType<typeof createGraphicsMock>[] = [];
  const canvasContexts: ReturnType<typeof createContextMock>[] = [];
  const existingTextures = new Set<string>(available);
  const loadImage = jest.fn();
  const createCanvas = jest.fn();
  const refresh = jest.fn();

  const camera = {
    width: VIEWPORT_W,
    height: VIEWPORT_H,
    scrollX: 0,
    scrollY: 0,
    getBounds: () => ({ x: 0, y: 0, width: WORLD_W, height: WORLD_H }),
  };

  const cloudImage = { width: cloudSize.width, height: cloudSize.height };

  const scene = {
    load: { image: loadImage },
    cameras: { main: camera },
    textures: {
      exists: (key: string) => existingTextures.has(key),
      get: (key: string) => ({
        source: [{ width: 540, height: BAND_HEIGHT }],
        getSourceImage: () =>
          key === CLOUD_SPRITE
            ? cloudImage
            : { width: 540, height: BAND_HEIGHT },
      }),
      createCanvas: createCanvas.mockImplementation((key: string) => {
        existingTextures.add(key);
        const context = createContextMock();
        canvasContexts.push(context);
        return { context, refresh };
      }),
    },
    add: {
      graphics: jest.fn(() => {
        const graphics = createGraphicsMock();
        // Mirror Phaser: the generated key is registered on the manager.
        graphics.generateTexture.mockImplementation(((key: string) => {
          existingTextures.add(key);
          return graphics;
        }) as never);
        graphicsMocks.push(graphics);
        return graphics;
      }),
      tileSprite: jest.fn(
        (_x: number, _y: number, w: number, h: number, key: string) => {
          const sprite = createTileSpriteMock(w, h, key);
          sprites.push(sprite);
          return sprite;
        },
      ),
    },
  };

  const parallax = new Phase3Parallax(scene as unknown as Phaser.Scene);

  return {
    parallax,
    sprites,
    graphicsMocks,
    canvasContexts,
    camera,
    scene,
    loadImage,
    createCanvas,
    refresh,
    keys: () => sprites.filter((s) => !s.destroyed).map((s) => s.key),
    update: () =>
      parallax.update(camera as unknown as Phaser.Cameras.Scene2D.Camera),
    live: () => sprites.filter((s) => !s.destroyed),
  };
}

describe("Phase3Parallax", () => {
  it("targets level 3 only", () => {
    expect(Phase3Parallax.LEVEL_NUMBER).toBe(3);
  });

  it("preloads the sky plus the optional cloud and mountain art", () => {
    const { scene, loadImage } = createHarness();

    Phase3Parallax.preload(scene as unknown as Phaser.Scene);

    expect(loadImage).toHaveBeenCalledWith(
      SKY,
      "maps/sao-joao-de-campina-grande/background.png",
    );
    expect(loadImage).toHaveBeenCalledWith(
      CLOUD_SPRITE,
      "maps/sao-joao-de-campina-grande/cloud.png",
    );
    expect(loadImage).toHaveBeenCalledWith(
      MOUNTAINS,
      "maps/sao-joao-de-campina-grande/mountains.png",
    );
    expect(loadImage).toHaveBeenCalledWith(
      MOUNTAINS_NEAR,
      "maps/sao-joao-de-campina-grande/mountains-near.png",
    );
  });

  it("creates one viewport-locked layer per configured layer", () => {
    const { parallax, sprites } = createHarness();

    parallax.create();

    expect(sprites).toHaveLength(PARALLAX_LAYERS.length);

    for (const sprite of sprites) {
      // Pinned to the viewport: the offset comes from tilePosition, not the camera.
      expect(sprite.scrollFactorX).toBe(0);
      expect(sprite.scrollFactorY).toBe(0);
      expect(sprite.width).toBe(VIEWPORT_W);
      expect(sprite.height).toBe(VIEWPORT_H);
      expect(sprite.tileScaleX).toBe(ART_SCALE);
      expect(sprite.tileScaleY).toBe(ART_SCALE);
      // Behind every gameplay object (Tiled layers default to 0).
      expect(sprite.depth).toBeLessThan(0);
    }

    // Nearer layers draw over farther ones, all the way down the stack.
    for (let i = 1; i < sprites.length; i++) {
      expect(sprites[i - 1].depth).toBeLessThan(sprites[i].depth);
    }
  });

  describe("texture sources", () => {
    it("composes the cloud band by stamping the single cloud sprite", () => {
      const { parallax, keys, canvasContexts, createCanvas, refresh } =
        createHarness({ available: [SKY, CLOUD_SPRITE] });

      parallax.create();

      expect(createCanvas).toHaveBeenCalledWith(CLOUDS_BAND, 540, BAND_HEIGHT);
      expect(createCanvas).toHaveBeenCalledWith(
        CLOUDS_NEAR_BAND,
        540,
        BAND_HEIGHT,
      );
      expect(keys()).toContain(CLOUDS_BAND);
      expect(keys()).toContain(CLOUDS_NEAR_BAND);

      // One draw per hand-placed stamp, none of which overhang at this size.
      const [context] = canvasContexts;
      expect(context.drawImage).toHaveBeenCalledTimes(CLOUD_STAMPS.length);
      // Flipped stamps mirror on X.
      expect(context.scale).toHaveBeenCalledWith(-1, 1);
      // The canvas has to be pushed to the WebGL texture.
      expect(refresh).toHaveBeenCalled();
    });

    it("redraws a cloud that overhangs an edge on the opposite side", () => {
      const { parallax, canvasContexts } = createHarness({
        available: [SKY, CLOUD_SPRITE],
        // Wide enough that stamps near the edges cross the seam.
        cloudSize: { width: 400, height: 80 },
      });

      parallax.create();

      const [context] = canvasContexts;
      // More draws than stamps means the wrap copies were emitted.
      expect(context.drawImage.mock.calls.length).toBeGreaterThan(
        CLOUD_STAMPS.length,
      );
    });

    it("uses the real near-mountain art when it is present", () => {
      const { parallax, keys } = createHarness({
        available: [SKY, MOUNTAINS_NEAR],
      });

      parallax.create();

      expect(keys()).toContain(MOUNTAINS_NEAR);
      expect(keys()).not.toContain(MOUNTAINS_NEAR_PLACEHOLDER);
      // The far range still falls back independently.
      expect(keys()).toContain(MOUNTAINS_PLACEHOLDER);
    });

    it("uses the real mountain art when it is present", () => {
      const { parallax, keys } = createHarness({
        available: [SKY, MOUNTAINS],
      });

      parallax.create();

      expect(keys()).toContain(MOUNTAINS);
      expect(keys()).not.toContain(MOUNTAINS_PLACEHOLDER);
    });

    it("falls back to placeholders while the art is missing", () => {
      const { parallax, keys, graphicsMocks, createCanvas } = createHarness();

      parallax.create();

      expect(keys()).toEqual([
        SKY,
        CLOUDS_PLACEHOLDER,
        MOUNTAINS_PLACEHOLDER,
        CLOUDS_NEAR_PLACEHOLDER,
        MOUNTAINS_NEAR_PLACEHOLDER,
      ]);
      expect(createCanvas).not.toHaveBeenCalled();
      expect(graphicsMocks).toHaveLength(4);

      // The ridge is drawn as whole-pixel rects, never as a smooth polygon,
      // which is what keeps its edges free of anti-aliasing.
      const ridgeGraphics = graphicsMocks.filter(
        (g) => g.fillRect.mock.calls.length > 0,
      );
      expect(ridgeGraphics).toHaveLength(2); // one per mountain range
      for (const graphics of ridgeGraphics) {
        expect(graphics.fillPoints).not.toHaveBeenCalled();
        for (const call of graphics.fillRect.mock.calls) {
          for (const arg of call) {
            expect(Number.isInteger(arg)).toBe(true);
          }
        }
      }

      // Scratch graphics must not linger on the display list.
      for (const graphics of graphicsMocks) {
        expect(graphics.destroy).toHaveBeenCalled();
      }
    });

    it("reuses an already-composed band instead of rebuilding it", () => {
      const { parallax, createCanvas } = createHarness({
        available: [SKY, CLOUD_SPRITE, CLOUDS_BAND, CLOUDS_NEAR_BAND],
      });

      parallax.create();

      expect(createCanvas).not.toHaveBeenCalled();
    });

    it("skips a layer that has no texture at all", () => {
      const { parallax, keys } = createHarness({ available: [] });

      parallax.create();

      // No sky art and no sky fallback, so only the generated layers remain.
      expect(keys()).toEqual([
        CLOUDS_PLACEHOLDER,
        MOUNTAINS_PLACEHOLDER,
        CLOUDS_NEAR_PLACEHOLDER,
        MOUNTAINS_NEAR_PLACEHOLDER,
      ]);
    });
  });

  it("applies the target horizontal parallax rates", () => {
    const { parallax, sprites, camera, update } = createHarness();

    parallax.create();
    camera.scrollX = 1000;
    update();

    const [sky, clouds, mountains] = sprites;
    // tilePosition is in texture pixels, so the world offset is divided by the scale.
    expect(sky.tilePositionX).toBe(0);
    expect(clouds.tilePositionX).toBeCloseTo(
      (1000 * rateOf("clouds")) / ART_SCALE,
    );
    expect(mountains.tilePositionX).toBeCloseTo(
      (1000 * rateOf("mountains")) / ART_SCALE,
    );

    // The depth ordering the effect depends on: the sky is pinned, clouds trail
    // the mountains, and both trail the world.
    expect(rateOf("sky")).toBe(0);
    expect(rateOf("clouds")).toBeGreaterThan(0);
    expect(clouds.tilePositionX).toBeLessThan(mountains.tilePositionX);
    expect(mountains.tilePositionX * ART_SCALE).toBeLessThan(camera.scrollX);
  });

  it("keeps the vertical drift inside the spare art height", () => {
    const { parallax, sprites, camera, update } = createHarness();

    parallax.create();
    update();
    expect(sprites.map((s) => s.tilePositionY)).toEqual(
      PARALLAX_LAYERS.map(() => 0),
    );

    // Bottom of the world: the largest drift any layer will ever be asked for.
    camera.scrollY = WORLD_H - VIEWPORT_H;
    update();

    sprites.forEach((sprite, i) => {
      const expected = (HEADROOM * PARALLAX_LAYERS[i].driftY) / ART_SCALE;
      expect(sprite.tilePositionY).toBeCloseTo(expected);
    });

    for (const sprite of sprites) {
      // Staying under the headroom is what stops the sky wrapping and
      // rendering a second moon.
      expect(sprite.tilePositionY * ART_SCALE).toBeLessThanOrEqual(HEADROOM);
    }
  });

  it("clamps the drift past the camera bounds", () => {
    const { parallax, sprites, camera, update } = createHarness();

    parallax.create();
    camera.scrollY = WORLD_H * 2;
    update();

    for (const sprite of sprites) {
      expect(sprite.tilePositionY * ART_SCALE).toBeLessThanOrEqual(HEADROOM);
    }
  });

  describe("mountain ridge geometry", () => {
    const BAND_WIDTH = 540;
    const BAND_HEIGHT = 320;

    const columns = (overrides: Partial<MountainRidgeConfig> = {}) =>
      buildRidgeColumns({ ...MOUNTAIN_RIDGE, ...overrides });

    const peak = (cols: Array<{ top: number }>) =>
      Math.min(...cols.map((c) => c.top));
    const dip = (cols: Array<{ top: number }>) =>
      Math.max(...cols.map((c) => c.top));

    it("snaps every edge to a whole pixel", () => {
      // Fractional edges are what the canvas anti-aliases, and ART_SCALE would
      // magnify each blended pixel into a 4x4 smudge.
      for (const column of columns()) {
        expect(Number.isInteger(column.top)).toBe(true);
        expect(Number.isInteger(column.x)).toBe(true);
        expect(Number.isInteger(column.width)).toBe(true);
      }
    });

    it("covers the band exactly once, with no gaps or overlap", () => {
      const cols = columns();

      expect(cols[0].x).toBe(0);
      for (let i = 1; i < cols.length; i++) {
        expect(cols[i].x).toBe(cols[i - 1].x + cols[i - 1].width);
      }

      const last = cols[cols.length - 1];
      expect(last.x + last.width).toBe(BAND_WIDTH);
    });

    it("widens the steps with pixelStep", () => {
      expect(columns({ pixelStep: 1 })).toHaveLength(BAND_WIDTH);
      expect(columns({ pixelStep: 6 })).toHaveLength(BAND_WIDTH / 6);

      for (const column of columns({ pixelStep: 6 })) {
        expect(column.width).toBe(6);
      }
    });

    it("meets itself at the tiling seam", () => {
      // Equal heights at both ends is what hides the seam when the band wraps.
      expect(ridgeTopAt(BAND_WIDTH)).toBe(ridgeTopAt(0));
    });

    it("puts the tallest peak exactly `height` above the band bottom", () => {
      // The knob has to mean what it says, since it is tuned by eye.
      for (const height of [80, 145, 240]) {
        expect(peak(columns({ height }))).toBe(BAND_HEIGHT - height);
      }
    });

    it("spans `relief` from peak to dip, within pixel snapping", () => {
      // Only meaningful while the range fits on the band, i.e. relief <= height.
      for (const relief of [10, 66, 120]) {
        const cols = columns({ height: 145, relief });
        expect(dip(cols) - peak(cols)).toBeCloseTo(relief, 0);
      }
    });

    it("clamps dips at the band bottom when relief exceeds height", () => {
      const cols = columns({ height: 145, relief: 400 });

      expect(peak(cols)).toBe(BAND_HEIGHT - 145);
      expect(dip(cols)).toBe(BAND_HEIGHT);
    });

    it("keeps the silhouette on the band at extreme settings", () => {
      for (const column of columns({ height: 900, relief: 900 })) {
        expect(column.top).toBeGreaterThanOrEqual(0);
        expect(column.top).toBeLessThanOrEqual(BAND_HEIGHT);
      }
    });
  });

  describe("near cloud layer", () => {
    const layer = (id: string) =>
      PARALLAX_LAYERS.find((entry) => entry.id === id);

    it("scrolls faster than the far clouds and the far mountains", () => {
      expect(layer("cloudsNear")?.factorX ?? 0).toBeGreaterThan(
        layer("clouds")?.factorX ?? 0,
      );
      expect(layer("cloudsNear")?.factorX ?? 0).toBeGreaterThan(
        layer("mountains")?.factorX ?? 0,
      );
      expect(layer("cloudsNear")?.factorX ?? 0).toBeLessThan(1);
    });

    it("draws in front of the far mountains, behind the near ones", () => {
      const depth = layer("cloudsNear")?.depth ?? 0;

      expect(depth).toBeGreaterThan(layer("mountains")?.depth ?? 0);
      expect(depth).toBeLessThan(layer("mountainsNear")?.depth ?? 0);
      expect(depth).toBeLessThan(0);
    });

    it("owns the three lower clouds, and the far layer no longer does", () => {
      expect(CLOUD_STAMPS_NEAR).toEqual([
        { x: 50, y: 130, scale: 1.1, alpha: 0.99 },
        { x: 230, y: 138, scale: 1, alpha: 0.99, flip: true },
        { x: 470, y: 160, scale: 1.2, alpha: 0.99, flip: true },
      ]);

      // No stamp may appear on both layers, or a cloud renders twice at two
      // different speeds.
      for (const nearStamp of CLOUD_STAMPS_NEAR) {
        expect(
          CLOUD_STAMPS.some(
            (farStamp) =>
              farStamp.x === nearStamp.x && farStamp.y === nearStamp.y,
          ),
        ).toBe(false);
      }
    });

    it("composes its own band from its own stamps", () => {
      const { parallax, canvasContexts } = createHarness({
        available: [SKY, CLOUD_SPRITE],
      });

      parallax.create();

      // Bands are built in layer order: far clouds first, then near.
      const [farBand, nearBand] = canvasContexts;
      expect(farBand.drawImage).toHaveBeenCalledTimes(CLOUD_STAMPS.length);
      expect(nearBand.drawImage).toHaveBeenCalledTimes(
        CLOUD_STAMPS_NEAR.length,
      );
    });

    it("sits lower on screen than the far clouds", () => {
      const lowest = (stamps: readonly { y: number }[]) =>
        Math.min(...stamps.map((stamp) => stamp.y));

      // Larger y is further down the band, which reads as closer.
      expect(lowest(CLOUD_STAMPS_NEAR)).toBeGreaterThan(lowest(CLOUD_STAMPS));
    });
  });

  describe("near mountain range", () => {
    const near = () =>
      PARALLAX_LAYERS.find((layer) => layer.id === "mountainsNear");
    const far = () => PARALLAX_LAYERS.find((layer) => layer.id === "mountains");

    it("is configured", () => {
      expect(near()).toBeDefined();
      expect(far()).toBeDefined();
    });

    it("scrolls faster than the far range but slower than the world", () => {
      expect(near()?.factorX ?? 0).toBeGreaterThan(far()?.factorX ?? 0);
      expect(near()?.factorX ?? 0).toBeLessThan(1);
    });

    it("draws in front of the far range, still behind gameplay", () => {
      expect(near()?.depth ?? 0).toBeGreaterThan(far()?.depth ?? 0);
      expect(near()?.depth ?? 0).toBeLessThan(0);
    });

    it("is lighter than the far range", () => {
      const brightness = (color: number) =>
        ((color >> 16) & 0xff) + ((color >> 8) & 0xff) + (color & 0xff);

      expect(brightness(MOUNTAIN_RIDGE_NEAR.color)).toBeGreaterThan(
        brightness(MOUNTAIN_RIDGE.color),
      );
    });

    it("has its own silhouette rather than a copy of the far one", () => {
      const farTops = buildRidgeColumns(MOUNTAIN_RIDGE).map((c) => c.top);
      const nearTops = buildRidgeColumns(MOUNTAIN_RIDGE_NEAR).map((c) => c.top);

      // Not just shifted vertically: the profile itself has to differ, or the
      // two ranges read as one range drawn twice.
      const farShape = farTops.map((top) => top - Math.min(...farTops));
      const nearShape = nearTops.map((top) => top - Math.min(...nearTops));
      expect(nearShape).not.toEqual(farShape);
      expect(MOUNTAIN_RIDGE_NEAR.variation).not.toBe(MOUNTAIN_RIDGE.variation);
    });

    it("sits lower on screen than the far range", () => {
      const farPeak = Math.min(
        ...buildRidgeColumns(MOUNTAIN_RIDGE).map((c) => c.top),
      );
      const nearPeak = Math.min(
        ...buildRidgeColumns(MOUNTAIN_RIDGE_NEAR).map((c) => c.top),
      );

      // Larger top means further down the band, which reads as closer.
      expect(nearPeak).toBeGreaterThan(farPeak);
    });

    it("keeps `height` exact for its own variation", () => {
      // The wave range is cached per variation; a stale cache would skew this.
      const tops = buildRidgeColumns(MOUNTAIN_RIDGE_NEAR).map((c) => c.top);
      expect(Math.min(...tops)).toBe(320 - MOUNTAIN_RIDGE_NEAR.height);
    });
  });

  it("does not duplicate layers when create runs twice", () => {
    const { parallax, sprites, live } = createHarness();

    parallax.create();
    parallax.create();

    expect(sprites).toHaveLength(PARALLAX_LAYERS.length);
    expect(live()).toHaveLength(PARALLAX_LAYERS.length);
  });

  it("destroys its layers and tolerates repeat calls", () => {
    const { parallax, sprites, live, update } = createHarness();

    parallax.create();
    parallax.destroy();

    expect(live()).toHaveLength(0);
    for (const sprite of sprites) {
      expect(sprite.destroy).toHaveBeenCalledTimes(1);
    }

    expect(() => parallax.destroy()).not.toThrow();
    expect(() => update()).not.toThrow();
  });

  it("rebuilds cleanly after a destroy, as on re-entering the level", () => {
    const { parallax, sprites, live } = createHarness();

    parallax.create();
    parallax.destroy();
    parallax.create();

    expect(sprites).toHaveLength(PARALLAX_LAYERS.length * 2);
    expect(live()).toHaveLength(PARALLAX_LAYERS.length);
  });
});
