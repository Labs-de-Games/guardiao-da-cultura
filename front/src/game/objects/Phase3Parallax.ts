import type * as Phaser from "phaser";

const SKY_KEY = "phase3_sky";
const CLOUD_SPRITE_KEY = "phase3_cloud";
const MOUNTAINS_KEY = "phase3_mountains";
const MOUNTAINS_NEAR_KEY = "phase3_mountains_near";

/** Tileable cloud bands, composed at runtime from copies of CLOUD_SPRITE_KEY. */
const CLOUDS_BAND_KEY = "phase3_clouds_band";
const CLOUDS_NEAR_BAND_KEY = "phase3_clouds_near_band";

const SKY_PATH = "maps/sao-joao-de-campina-grande/background.png";
const CLOUD_PATH = "maps/sao-joao-de-campina-grande/cloud.png";
const MOUNTAINS_PATH = "maps/sao-joao-de-campina-grande/mountains.png";
const MOUNTAINS_NEAR_PATH =
  "maps/sao-joao-de-campina-grande/mountains-near.png";

/** Size of the runtime-composed bands. Matches the sky art so one scale fits all. */
const BAND_WIDTH = 540;
const BAND_HEIGHT = 320;

/**
 * Integer scale, so the pixel-art sky stays crisp under `pixelArt: true`.
 * 4x turns 540x320 into 2160x1280, which covers a 1920x1080 viewport and
 * leaves 200px of vertical headroom for the drift applied in `update`.
 */
const ART_SCALE = 4;

export interface LayerSpec {
  id: "sky" | "clouds" | "mountains" | "cloudsNear" | "mountainsNear";
  /** Horizontal parallax rate: 0 is pinned to the viewport, 1 matches the world. */
  factorX: number;
  /** Share of the layer's spare art height consumed over the full vertical travel. */
  driftY: number;
  depth: number;
}

/** Scroll rates per layer. Exported so tuning stays in one place. */
export const PARALLAX_LAYERS: readonly LayerSpec[] = [
  { id: "sky", factorX: 0, driftY: 0.5, depth: -30 },
  { id: "clouds", factorX: 0.03, driftY: 0.75, depth: -20 },
  { id: "mountains", factorX: 0.08, driftY: 1, depth: -10 },
  { id: "cloudsNear", factorX: 0.11, driftY: 0.85, depth: -8 },
  { id: "mountainsNear", factorX: 0.13, driftY: 1, depth: -5 },
];

/**
 * Phase3Parallax draws the night-sky backdrop for level 3 only.
 *
 * Three viewport-sized TileSprites sit behind the Tiled world at negative
 * depths and are scrolled by hand from the camera each frame:
 *
 *   moon + stars    -> static horizontally
 *   far clouds      -> slow parallax
 *   far mountains   -> medium parallax
 *   near clouds     -> faster parallax
 *   near mountains  -> fastest parallax
 *   Tiled world     -> normal camera (1.00)
 *
 * See `PARALLAX_LAYERS` for the current rates.
 *
 * The sprites use `setScrollFactor(0)` so they never leave the viewport, and
 * `tilePositionX/Y` supplies the offset instead. Horizontal offsets wrap
 * inside the texture, so there is no seam however far the camera pans.
 *
 * Purely visual: it touches no Tiled data, physics, or camera behaviour.
 */
export class Phase3Parallax {
  /** `levelNumber` of the only level this backdrop belongs to. */
  static readonly LEVEL_NUMBER = 3;

  private readonly scene: Phaser.Scene;
  private layers: Array<{
    sprite: Phaser.GameObjects.TileSprite;
    spec: LayerSpec;
    /** Source height of this layer's texture, which sets its drift headroom. */
    artHeight: number;
  }> = [];

  static preload(scene: Phaser.Scene) {
    scene.load.image(SKY_KEY, SKY_PATH);
    // Optional: each falls back to a generated placeholder while the art is
    // missing. A 404 here is harmless, the loader carries on.
    scene.load.image(CLOUD_SPRITE_KEY, CLOUD_PATH);
    scene.load.image(MOUNTAINS_KEY, MOUNTAINS_PATH);
    scene.load.image(MOUNTAINS_NEAR_KEY, MOUNTAINS_NEAR_PATH);
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Builds the three layers. Safe to call twice: a second call while layers
   * exist is a no-op, so re-entering the level cannot duplicate the backdrop.
   */
  public create() {
    if (this.layers.length > 0) return;

    const camera = this.scene.cameras.main;

    for (const spec of PARALLAX_LAYERS) {
      const key = resolveTexture(this.scene, spec.id);
      if (!key) continue;

      const sprite = this.scene.add
        .tileSprite(0, 0, camera.width, camera.height, key)
        .setOrigin(0, 0)
        .setScrollFactor(0, 0)
        .setDepth(spec.depth);

      sprite.setTileScale(ART_SCALE, ART_SCALE);

      this.layers.push({
        sprite,
        spec,
        artHeight: textureHeight(this.scene, key) ?? BAND_HEIGHT,
      });
    }

    this.update(camera);
  }

  /** Re-offsets every layer from the camera. Call once per frame. */
  public update(camera: Phaser.Cameras.Scene2D.Camera) {
    if (this.layers.length === 0) return;

    // Vertical drift is a fraction of the leftover art height rather than a
    // scroll factor: the art is only 200px taller than the viewport while the
    // camera travels ~2000px, so a plain factor would run past the texture and
    // repeat the moon. Mapping the whole descent onto the available headroom
    // keeps the motion continuous instead.
    const bounds = camera.getBounds();
    const maxScrollY = Math.max(0, bounds.height - camera.height);
    const progressY =
      maxScrollY > 0
        ? Math.min(1, Math.max(0, camera.scrollY / maxScrollY))
        : 0;

    for (const { sprite, spec, artHeight } of this.layers) {
      const headroomY = Math.max(0, artHeight * ART_SCALE - sprite.height);

      sprite.tilePositionX = (camera.scrollX * spec.factorX) / ART_SCALE;
      sprite.tilePositionY = (headroomY * spec.driftY * progressY) / ART_SCALE;
    }
  }

  /**
   * The backdrop is atmospheric set dressing, not part of the physically lit
   * world, so it must opt out of dynamic lighting. It also sits behind the
   * Tiled world as viewport-sized layers with no camera culling, so every
   * one of its pixels would otherwise run the multi-light shader every
   * frame — call after `Game.setupLighting()`'s blanket enable sweep.
   */
  public setLighting(enabled: boolean) {
    for (const { sprite } of this.layers) {
      sprite.setLighting(enabled);
    }
  }

  /** Destroys the layers. Safe to call more than once. */
  public destroy() {
    for (const { sprite } of this.layers) {
      sprite.destroy();
    }
    this.layers = [];
  }
}

/**
 * Picks the texture for a layer, generating one where the art is still
 * missing. Returns null only when a layer has nothing to draw at all.
 */
function resolveTexture(
  scene: Phaser.Scene,
  id: LayerSpec["id"],
): string | null {
  switch (id) {
    case "sky":
      return scene.textures.exists(SKY_KEY) ? SKY_KEY : null;
    case "clouds":
      return composeCloudBand(
        scene,
        CLOUDS_BAND_KEY,
        CLOUD_STAMPS,
        CLOUDS_PLACEHOLDER_KEY,
      );
    case "cloudsNear":
      return composeCloudBand(
        scene,
        CLOUDS_NEAR_BAND_KEY,
        CLOUD_STAMPS_NEAR,
        CLOUDS_NEAR_PLACEHOLDER_KEY,
      );
    case "mountains":
      return scene.textures.exists(MOUNTAINS_KEY)
        ? MOUNTAINS_KEY
        : createRidgeTexture(scene, MOUNTAINS_PLACEHOLDER_KEY, MOUNTAIN_RIDGE);
    case "mountainsNear":
      return scene.textures.exists(MOUNTAINS_NEAR_KEY)
        ? MOUNTAINS_NEAR_KEY
        : createRidgeTexture(
            scene,
            MOUNTAINS_NEAR_PLACEHOLDER_KEY,
            MOUNTAIN_RIDGE_NEAR,
          );
  }
}

function textureHeight(scene: Phaser.Scene, key: string): number | null {
  const source = scene.textures.get(key)?.source?.[0];
  return source?.height ?? null;
}

// ------------------------------------------------------------
//  CLOUD BAND
//  One cloud sprite is stamped across a tileable band, so the art is a single
//  small PNG instead of a hand-painted strip.
// ------------------------------------------------------------

export interface CloudStamp {
  x: number;
  y: number;
  scale: number;
  alpha: number;
  flip?: boolean;
}

/**
 * Where each copy of the cloud lands on the band. Hand-placed rather than
 * randomised so the band is identical on every run and the seam is predictable.
 */
export const CLOUD_STAMPS: readonly CloudStamp[] = [
  { x: 110, y: 76, scale: 0.75, alpha: 0.99 },
  { x: 168, y: 98, scale: 0.6, alpha: 0.99 },
  { x: 330, y: 118, scale: 0.9, alpha: 0.99, flip: true },
  { x: 450, y: 64, scale: 0.85, alpha: 0.99, flip: true },
];

/** The nearer, lower clouds. Scrolled faster by PARALLAX_LAYERS. */
export const CLOUD_STAMPS_NEAR: readonly CloudStamp[] = [
  { x: 50, y: 130, scale: 1.1, alpha: 0.99 },
  { x: 230, y: 138, scale: 1, alpha: 0.99, flip: true },
  { x: 470, y: 160, scale: 1.2, alpha: 0.99, flip: true },
];

function composeCloudBand(
  scene: Phaser.Scene,
  bandKey: string,
  stamps: readonly CloudStamp[],
  placeholderKey: string,
): string | null {
  if (scene.textures.exists(bandKey)) return bandKey;
  if (!scene.textures.exists(CLOUD_SPRITE_KEY)) {
    return createPlaceholderClouds(scene, placeholderKey, stamps);
  }

  const band = scene.textures.createCanvas(bandKey, BAND_WIDTH, BAND_HEIGHT);
  if (!band) return createPlaceholderClouds(scene, placeholderKey, stamps);

  const cloud = scene.textures
    .get(CLOUD_SPRITE_KEY)
    .getSourceImage() as HTMLImageElement;
  const context = band.context;

  for (const stamp of stamps) {
    const width = cloud.width * stamp.scale;
    const height = cloud.height * stamp.scale;

    drawCloud(context, cloud, stamp, width, height);

    // A cloud overhanging an edge is drawn again on the opposite side, so it
    // continues across the seam when the band tiles.
    if (stamp.x - width / 2 < 0) {
      drawCloud(
        context,
        cloud,
        { ...stamp, x: stamp.x + BAND_WIDTH },
        width,
        height,
      );
    } else if (stamp.x + width / 2 > BAND_WIDTH) {
      drawCloud(
        context,
        cloud,
        { ...stamp, x: stamp.x - BAND_WIDTH },
        width,
        height,
      );
    }
  }

  // Pushes the canvas up to the WebGL texture.
  band.refresh();

  return bandKey;
}

function drawCloud(
  context: CanvasRenderingContext2D,
  cloud: HTMLImageElement,
  stamp: CloudStamp,
  width: number,
  height: number,
) {
  context.save();
  context.imageSmoothingEnabled = false;
  context.globalAlpha = stamp.alpha;
  context.translate(stamp.x, stamp.y);
  if (stamp.flip) context.scale(-1, 1);
  context.drawImage(cloud, -width / 2, -height / 2, width, height);
  context.restore();
}

// ------------------------------------------------------------
//  GENERATED MOUNTAIN RIDGES
//  Drives both ranges, and used for either one whose PNG is absent. Tunable
//  rather than throwaway, since the procedural silhouette may end up being the
//  shipped look.
// ------------------------------------------------------------

const MOUNTAINS_PLACEHOLDER_KEY = "phase3_mountains_placeholder";
const MOUNTAINS_NEAR_PLACEHOLDER_KEY = "phase3_mountains_near_placeholder";

export interface MountainRidgeConfig {
  /**
   * How tall the range stands, in band pixels measured from the bottom of the
   * band to the tip of its highest peak. Rendered 4x larger on screen, so 145
   * fills about 580px of a 1080px viewport. A nearer range wants a smaller
   * value: its peaks then sit lower on screen and hide the far range's feet.
   */
  height: number;
  /**
   * Vertical distance between the highest peak and the lowest dip. Larger
   * values give a more dramatic, jagged range; smaller values flatten it
   * towards a straight line. Values above `height` clamp at the band bottom.
   */
  relief: number;
  /**
   * Width of each silhouette step, in band pixels. 1 puts the ridge on the same
   * pixel grid as the sky art, so a step is 4 screen pixels at ART_SCALE. Raise
   * it for a chunkier, more deliberately blocky skyline.
   */
  pixelStep: number;
  /** Silhouette fill colour. Nearer ranges read as closer when lighter. */
  color: number;
  /**
   * Shifts the harmonics to give a different profile. Two ranges sharing a
   * profile look like one range drawn twice, so each wants its own value.
   * Any number works; it is not an x-offset, it reshapes the curve.
   */
  variation: number;
}

/** The far range: darkest and slowest, sitting highest on screen. */
export const MOUNTAIN_RIDGE: MountainRidgeConfig = {
  height: 180,
  relief: 55,
  pixelStep: 1,
  color: 0x0a1024,
  variation: 0,
};

/** The near range: lighter, lower, and scrolled faster by PARALLAX_LAYERS. */
export const MOUNTAIN_RIDGE_NEAR: MountainRidgeConfig = {
  height: 130,
  relief: 55,
  pixelStep: 1,
  color: 0x172343,
  variation: 1.1,
};

/**
 * Harmonics summed to shape a ridge. Whole-number periods are what make the
 * curve meet itself at the seam, so keep them integers. Their weights only set
 * each harmonic's relative influence on the shape; overall size comes from the
 * config, since the summed curve is normalised against its measured range.
 */
const RIDGE_HARMONICS = [
  { weight: 0.553, period: 1, phase: 0 },
  { weight: 0.298, period: 3, phase: 1.1 },
  { weight: 0.149, period: 7, phase: 2.4 },
] as const;

function ridgeWave(x: number, variation: number): number {
  const t = (x / BAND_WIDTH) * Math.PI * 2;

  let wave = 0;
  for (const harmonic of RIDGE_HARMONICS) {
    wave +=
      harmonic.weight *
      Math.sin(harmonic.period * t + harmonic.phase + variation);
  }
  return wave;
}

/**
 * A curve's true range, measured at the whole-pixel positions the columns
 * sample. Normalising against this is what lets `height` and `relief` describe
 * the silhouette exactly: the harmonics never reach their maxima together, so
 * their summed amplitude would overstate both.
 *
 * Cached per variation, since adding a constant to phases of differing periods
 * reshapes the curve rather than sliding it, changing the extremes.
 */
const waveRanges = new Map<number, { highest: number; span: number }>();

function waveRangeFor(variation: number): { highest: number; span: number } {
  const cached = waveRanges.get(variation);
  if (cached) return cached;

  let lowest = Number.POSITIVE_INFINITY;
  let highest = Number.NEGATIVE_INFINITY;
  for (let x = 0; x < BAND_WIDTH; x++) {
    const wave = ridgeWave(x, variation);
    lowest = Math.min(lowest, wave);
    highest = Math.max(highest, wave);
  }

  const range = { highest, span: highest - lowest || 1 };
  waveRanges.set(variation, range);
  return range;
}

/**
 * Top edge of the silhouette at band x, snapped to a whole band pixel. The
 * snapping is the point: a fractional edge gets rasterised with anti-aliasing,
 * and ART_SCALE would then magnify each blended pixel into a 4x4 smudge.
 */
export function ridgeTopAt(
  x: number,
  config: MountainRidgeConfig = MOUNTAIN_RIDGE,
): number {
  const range = waveRangeFor(config.variation);
  const normalised =
    (range.highest - ridgeWave(x, config.variation)) / range.span;
  const top = BAND_HEIGHT - config.height + normalised * config.relief;

  // Clamped so an oversized height or relief cannot leave the band.
  return Math.min(BAND_HEIGHT, Math.max(0, Math.round(top)));
}

export interface RidgeColumn {
  x: number;
  width: number;
  top: number;
}

/**
 * The silhouette as whole-pixel columns, left to right, covering the band
 * exactly once. Sampled on each column's left edge so the positions line up
 * with the measured wave range.
 */
export function buildRidgeColumns(
  config: MountainRidgeConfig = MOUNTAIN_RIDGE,
): RidgeColumn[] {
  const step = Math.max(1, Math.round(config.pixelStep));
  const columns: RidgeColumn[] = [];

  for (let x = 0; x < BAND_WIDTH; x += step) {
    columns.push({
      x,
      width: Math.min(step, BAND_WIDTH - x),
      top: ridgeTopAt(x, config),
    });
  }

  return columns;
}

function createRidgeTexture(
  scene: Phaser.Scene,
  key: string,
  config: MountainRidgeConfig,
): string {
  if (scene.textures.exists(key)) return key;

  const graphics = scene.add.graphics();
  graphics.fillStyle(config.color, 1);

  // Axis-aligned rectangles on whole-pixel bounds instead of one filled
  // polygon: the canvas rasterises these with hard edges, so the silhouette
  // stays crisp when ART_SCALE magnifies it.
  for (const column of buildRidgeColumns(config)) {
    graphics.fillRect(
      column.x,
      column.top,
      column.width,
      BAND_HEIGHT - column.top,
    );
  }

  graphics.generateTexture(key, BAND_WIDTH, BAND_HEIGHT);
  graphics.destroy();

  return key;
}

// ------------------------------------------------------------
//  PLACEHOLDER CLOUDS
//  Used only while cloud.png is missing, so the layer still parallaxes.
// ------------------------------------------------------------

const CLOUDS_PLACEHOLDER_KEY = "phase3_clouds_placeholder";
const CLOUDS_NEAR_PLACEHOLDER_KEY = "phase3_clouds_near_placeholder";

/** Rough size of one placeholder blob at scale 1, in band pixels. */
const PLACEHOLDER_BLOB_WIDTH = 150;
const PLACEHOLDER_BLOB_HEIGHT = 34;

function createPlaceholderClouds(
  scene: Phaser.Scene,
  key: string,
  stamps: readonly CloudStamp[],
): string {
  if (scene.textures.exists(key)) return key;

  const graphics = scene.add.graphics();
  graphics.fillStyle(0x415a8c, 0.42);

  // Blobs follow the layer's own stamps, so each cloud layer falls back to a
  // stand-in with its own arrangement rather than a shared hardcoded one.
  for (const stamp of stamps) {
    graphics.fillEllipse(
      stamp.x,
      stamp.y,
      PLACEHOLDER_BLOB_WIDTH * stamp.scale,
      PLACEHOLDER_BLOB_HEIGHT * stamp.scale,
    );
  }

  graphics.generateTexture(key, BAND_WIDTH, BAND_HEIGHT);
  graphics.destroy();

  return key;
}
