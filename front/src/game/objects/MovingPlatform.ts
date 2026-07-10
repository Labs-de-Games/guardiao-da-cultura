import * as Phaser from "phaser";

export type PlatformDirection = "left" | "right" | "up" | "down";

export interface MovingPlatformConfig {
  /** World X position (already scaled). */
  x: number;
  /** World Y position (already scaled). */
  y: number;
  /** Platform width in world pixels (already scaled). */
  width: number;
  /** Platform height in world pixels (already scaled). */
  height: number;
  /** Pixels per second at peak speed. */
  speed: number;
  /** Travel axis direction. */
  direction: PlatformDirection;
  /** Distance (in world pixels, already scaled) the platform travels from its origin before reversing. */
  distance: number;
  /** Optional texture key for the platform. */
  texture?: string;
  /** Map scale factor (used to scale the texture sprite). */
  scale?: number;
}

/**
 * A one-way moving platform driven by Simple Harmonic Motion.
 *
 * Uses `body.setDirectControl(true)` so Phaser does NOT integrate velocity
 * into position. We set `this.x` / `this.y` each frame using an analytical
 * cosine function; Phaser's physics `preUpdate` reads the game-object position,
 * computes the delta from the previous frame, and uses that delta to carry
 * standing players along.
 *
 * The cosine wave naturally accelerates from rest at each endpoint and
 * decelerates back to rest, giving perfectly smooth reversals with zero jerk.
 */
export class MovingPlatform extends Phaser.Physics.Arcade.Sprite {
  private readonly axis: "x" | "y";
  private readonly dirSign: 1 | -1;
  private readonly speed: number;
  private readonly travelDistance: number;
  private readonly originPos: number;

  /** Current angle in radians (0 → 2π), drives the cosine wave. */
  private theta: number = 0;

  constructor(scene: Phaser.Scene, config: MovingPlatformConfig) {
    const textureKey = config.texture || "empty_platform";

    // Ensure the empty platform texture exists if needed
    if (
      textureKey === "empty_platform" &&
      !scene.textures.exists("empty_platform")
    ) {
      const graphics = scene.add.graphics();
      graphics.fillStyle(0xffffff, 0);
      graphics.fillRect(0, 0, 1, 1);
      graphics.generateTexture("empty_platform", 1, 1);
      graphics.destroy();
    }

    super(scene, config.x, config.y, textureKey);

    const scale = config.scale || 1;
    this.setOrigin(0, 0);
    this.setScale(scale);
    this.setDepth(19);

    if (textureKey === "empty_platform") {
      this.setVisible(false);
    }

    scene.add.existing(this);
    scene.physics.add.existing(this, false); // dynamic body

    // ── Resolve axis and direction sign ──────────────────────────
    switch (config.direction) {
      case "left":
        this.axis = "x";
        this.dirSign = -1;
        break;
      case "right":
        this.axis = "x";
        this.dirSign = 1;
        break;
      case "up":
        this.axis = "y";
        this.dirSign = -1;
        break;
      default:
        this.axis = "y";
        this.dirSign = 1;
        break;
    }

    this.speed = config.speed;
    this.travelDistance = config.distance;
    this.originPos = this.axis === "x" ? config.x : config.y;

    // ── Physics body setup ───────────────────────────────────────
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setAllowGravity(false);

    // Direct control: tells Arcade Physics that WE manage this body's position.
    // The engine will NOT integrate velocity into position, preventing the
    // fight between our manual updates and physics integration that caused flicker.
    body.setDirectControl(true);

    // One-way: only collide on top
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;

    // Set the body size to match the texture/scale or config dimensions.
    // We extend the height downward by a catch-net amount to prevent
    // fast-falling players from tunneling through the thin platform.
    // We pass `false` to setSize to prevent centering the body, and
    // explicitly set the offset to (0, 0) so the top of the body aligns
    // exactly with the top of the platform image.
    const CATCH_NET_PX = 128;
    if (config.texture) {
      body.setSize(
        this.frame.width,
        this.frame.height + CATCH_NET_PX / scale,
        false,
      );
    } else {
      body.setSize(
        config.width / scale,
        config.height / scale + CATCH_NET_PX / scale,
        false,
      );
    }
    body.setOffset(0, 0);

    // ── Hook into scene update ───────────────────────────────────
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);
    this.once(
      Phaser.GameObjects.Events.DESTROY,
      () => {
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this);
      },
      this,
    );
  }

  /**
   * Called every frame from the scene UPDATE event.
   *
   * Position follows a cosine wave:
   *   progress = (distance / 2) × (1 − cos(θ))
   *
   * θ advances by ω × dt each frame, where:
   *   ω = (2 × speed) / distance
   *
   * This guarantees:
   *  - Velocity = 0 at endpoints (θ = 0, π, 2π…)
   *  - Peak velocity = speed at midpoint (θ = π/2, 3π/2…)
   *  - Perfectly smooth acceleration and deceleration
   */
  private tick(_time: number, delta: number): void {
    if (!this.active) return;
    if (this.travelDistance <= 0) return;

    const dt = delta / 1000; // seconds
    if (dt <= 0) return;

    // Angular frequency: ω = (2 × speed) / distance
    const omega = (2 * this.speed) / this.travelDistance;
    const dTheta = omega * dt;

    this.theta = (this.theta + dTheta) % (Math.PI * 2);

    // progress = (distance / 2) × (1 − cos(θ))
    const progress = (this.travelDistance / 2) * (1 - Math.cos(this.theta));

    // Set position directly. With setDirectControl(true), Phaser's physics
    // preUpdate will automatically read the game-object position, store prev,
    // and compute the delta — which is used for friction/carry of the player.
    if (this.axis === "x") {
      this.x = this.originPos + progress * this.dirSign;
    } else {
      this.y = this.originPos + progress * this.dirSign;
    }
  }
}
