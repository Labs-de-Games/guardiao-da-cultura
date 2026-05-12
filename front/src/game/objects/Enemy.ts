import * as Phaser from "phaser";

const RAT_SQUEAK_AUDIO_KEY = "rat_squeak";
const RAT_FLEE_AUDIO_KEY = "rat_flee";

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  moveEvent: Phaser.Time.TimerEvent;
  direction: number;
  isDead: boolean = false;
  isFleeing: boolean = false;
  private moveSpeed: number = 200;

  static preload(scene: Phaser.Scene) {
    scene.load.spritesheet("enemy_walking", "animals/rat-walk.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    if (!scene.cache.audio.exists(RAT_SQUEAK_AUDIO_KEY)) {
      scene.load.audio(RAT_SQUEAK_AUDIO_KEY, "sound/rat_squeak.mp3");
    }

    if (!scene.cache.audio.exists(RAT_FLEE_AUDIO_KEY)) {
      scene.load.audio(RAT_FLEE_AUDIO_KEY, "sound/rat_flee.mp3");
    }
  }

  static createAnims(scene: Phaser.Scene) {
    scene.anims.create({
      key: "enemy_walk",
      frames: scene.anims.generateFrameNumbers("enemy_walking", {
        start: 0,
        end: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });
  }

  constructor(scene: Phaser.Scene, x: number, y: number, direction: number) {
    super(scene, x, y, "enemy_walking");

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.direction = direction;

    this.setScale(2.5);
    this.body?.setSize(26, 20);
    this.body?.setOffset(2, 10);
    this.setGravityY(8000);
    this.play("enemy_walk");

    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.once(
      Phaser.GameObjects.Events.DESTROY,
      () => {
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
        if (this.moveEvent) this.moveEvent.destroy();
      },
      this,
    );

    this.moveEvent = scene.time.addEvent({
      delay: 4000,
      callback: () => {
        this.direction *= -1;
      },
      loop: true,
    });
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;

    if (this.moveEvent) this.moveEvent.destroy();

    if (this.body) {
      this.body.velocity.x = 0;
      this.body.enable = false; // Disable physics
    }

    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.destroy();
    });
  }

  fleeLeftAndDisappear() {
    if (this.isDead || this.isFleeing) return;

    this.isFleeing = true;
    this.direction = -1;
    this.moveSpeed = 1234;

    this.scene.sound.play(RAT_SQUEAK_AUDIO_KEY, { volume: 0.6 });
    this.scene.sound.play(RAT_FLEE_AUDIO_KEY, { volume: 0.5 });

    if (this.moveEvent) this.moveEvent.destroy();

    if (this.body) {
      this.setVelocityY(-900);
      this.setVelocityX(-this.moveSpeed);
    }

    this.scene.time.delayedCall(1400, () => {
      if (this.active) {
        this.destroy();
      }
    });
  }

  update(_ts: number, _dt: number) {
    if (this.isDead) return;

    if (this.body) {
      if (this.isFleeing) {
        this.direction = -1;
      } else if (this.body.blocked.left && this.direction === -1) {
        this.direction = 1;
      } else if (this.body.blocked.right && this.direction === 1) {
        this.direction = -1;
      }
      this.setVelocityX(this.moveSpeed * this.direction);
      this.setFlipX(this.direction === -1);
    }
  }
}
