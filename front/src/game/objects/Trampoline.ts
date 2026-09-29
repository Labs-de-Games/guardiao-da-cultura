import * as Phaser from "phaser";

export interface TrampolineConfig {
  /** World X position (already scaled), treated as the bottom-center anchor. */
  x: number;
  /** World Y position (already scaled), treated as the bottom-center anchor. */
  y: number;
  /** Multiplier applied to the player's base jump velocity on contact. */
  power: number;
  /** Map scale factor. */
  scale?: number;
}

const TRAMPOLINE_ASSET = {
  key: "trampoline",
  path: "misc/trampoline.png",
  frameWidth: 28,
  frameHeight: 16,
} as const;

const TRAMPOLINE_ANIMS = {
  BOUNCE: {
    key: "trampoline_bounce",
    frames: [1, 2, 3, 4],
    frameRate: 28,
    repeat: 0,
  },
} as const;

/**
 * A static trampoline object. Like MovingPlatform, its body only collides
 * from above (one-way) so the player can approach from below/the sides
 * without being blocked.
 */
export class Trampoline extends Phaser.Physics.Arcade.Sprite {
  public readonly power: number;

  constructor(scene: Phaser.Scene, config: TrampolineConfig) {
    super(scene, config.x, config.y, TRAMPOLINE_ASSET.key, 0);

    this.power = config.power;

    const scale = config.scale ?? 1;
    this.setOrigin(0.5, 1);
    this.setScale(scale);
    this.setDepth(19);

    scene.add.existing(this);
    scene.physics.add.existing(this, false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setAllowGravity(false);
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
  }

  static preload(scene: Phaser.Scene) {
    scene.load.spritesheet(TRAMPOLINE_ASSET.key, TRAMPOLINE_ASSET.path, {
      frameWidth: TRAMPOLINE_ASSET.frameWidth,
      frameHeight: TRAMPOLINE_ASSET.frameHeight,
    });
  }

  static createAnims(scene: Phaser.Scene) {
    if (!scene.anims.exists(TRAMPOLINE_ANIMS.BOUNCE.key)) {
      scene.anims.create({
        key: TRAMPOLINE_ANIMS.BOUNCE.key,
        frames: scene.anims.generateFrameNumbers(TRAMPOLINE_ASSET.key, {
          frames: [...TRAMPOLINE_ANIMS.BOUNCE.frames],
        }),
        frameRate: TRAMPOLINE_ANIMS.BOUNCE.frameRate,
        repeat: TRAMPOLINE_ANIMS.BOUNCE.repeat,
      });
    }
  }

  /** Plays the compress/release animation once, then rests back on the idle frame. */
  public bounce(): void {
    this.play(TRAMPOLINE_ANIMS.BOUNCE.key, true);
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.setFrame(0);
    });
  }
}
