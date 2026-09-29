import * as Phaser from "phaser";
import { EventBus } from "../../shared/events/event-bus";
import { AudioManager } from "../audio";

/**
 * EffectsManager encapsula transformações de câmera, filtros de cor e efeitos ambientais.
 */

export class EffectsManager {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private colorMatrix?: Phaser.Display.ColorMatrix;
  private vignette?: Phaser.Filters.Vignette;
  private scoreFeedbackStar: Phaser.GameObjects.Sprite | null = null;
  private scoreFeedbackActive = false;
  public scoreFeedbackFloatY = 0;

  static preload(_scene: Phaser.Scene) {
    // Sounds are now loaded via AudioManager/registry
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  /** Ajusta o zoom da câmera com transição suave */
  public setZoom(zoom: number, duration: number = 500) {
    this.scene.tweens.add({
      targets: this.camera,
      zoom: zoom,
      duration: duration,
      ease: "Power2",
      overwrite: true,
    });
  }

  /** Ajusta o nível de Grayscale (0 a 1) com transição suave. No-op: never wired to a live filter. */
  public setGrayscale(_amount: number, _duration: number = 1000) {}

  /** Shake de câmera para feedback de erro/dano */
  public shake(duration: number = 250, intensity: number = 0.01) {
    this.camera.shake(duration, intensity);
  }

  /**
   * Padrão de pan suave
   */
  public panTo(
    x: number,
    y: number,
    duration: number = 1000,
    ease: string = "Sine.easeInOut",
    force: boolean = true,
  ) {
    this.camera.pan(x, y, duration, ease, force);
  }

  public shakeHorizontal(duration = 150, intensity = 0.015): number {
    const cam = this.camera;
    const startX = cam.scrollX;
    const steps = Math.ceil(duration / 16);
    let step = 0;

    AudioManager.playSfx("sfx.puzzle.failure");

    this.scene.time.addEvent({
      delay: 16,
      repeat: steps - 1,
      callback: () => {
        step++;
        const t = step / steps;
        const decay = 1 - t;
        const offset = (Math.random() * 2 - 1) * intensity * cam.width * decay;
        cam.scrollX = startX + offset;
      },
    });

    return steps * 16;
  }

  /** Flash de tela para feedback positivo */
  public flash(duration: number = 300, color: number = 0xffffff) {
    this.camera.flash(
      duration,
      (color >> 16) & 0xff,
      (color >> 8) & 0xff,
      color & 0xff,
    );
  }

  public showSpotlightBeam() {
    // Visual beam graphic is gone now that spotlights use native cone
    // lights (see SpotlightSystem), but this is also the shared "placeholder
    // solved" hook for paintings, sculptures, posters, costumes and photo
    // puzzles, so the success sound must still play.
    AudioManager.playSfx("sfx.puzzle.success", 0.7);
  }

  public playScoreFeedback(x: number, y: number) {
    if (this.scoreFeedbackActive && this.scoreFeedbackStar) {
      this.scoreFeedbackStar.destroy();
    }

    this.scoreFeedbackActive = true;
    this.scoreFeedbackFloatY = 0;

    AudioManager.playSfx("sfx.star.earned");

    this.scoreFeedbackStar = this.scene.add.sprite(x, y - 400, "star");
    this.scoreFeedbackStar.setDepth(50);
    this.scoreFeedbackStar.setScale(4);
    this.scoreFeedbackStar.play("star_anim");

    this.scene.tweens.add({
      targets: this,
      scoreFeedbackFloatY: -10,
      duration: 3240,
      ease: "Sine.easeOut",
      onComplete: () => {
        if (this.scoreFeedbackStar) {
          this.scoreFeedbackStar.destroy();
          this.scoreFeedbackStar = null;
        }
        this.scoreFeedbackActive = false;

        // Notify systems that the star animation has finished
        EventBus.emit("star-animation-complete", undefined);
      },
    });

    this.scene.tweens.add({
      targets: this.scoreFeedbackStar,
      scaleX: 3,
      scaleY: 3,
      yoyo: true,
      duration: 450,
      repeat: -1,
    });
  }

  public updateScoreFeedback(
    playerX: number,
    playerY: number,
    playerHeight: number = 32,
  ) {
    if (this.scoreFeedbackActive && this.scoreFeedbackStar) {
      this.scoreFeedbackStar.x = playerX;
      this.scoreFeedbackStar.y =
        playerY - playerHeight / 2 - 65 + this.scoreFeedbackFloatY;
    }
  }

  private static readonly CONFETTI_TEXTURE = "confetti";
  private static readonly CONFETTI_COLORS = [
    0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93,
  ];
  /** Total degrees each confetti particle spins over its lifespan. */
  private static readonly CONFETTI_SPIN_DEGREES = 720;

  private ensureConfettiTexture() {
    if (this.scene.textures.exists(EffectsManager.CONFETTI_TEXTURE)) return;

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 30, 9);
    graphics.generateTexture(EffectsManager.CONFETTI_TEXTURE, 30, 9);
    graphics.destroy();
  }

  private spawnConfettiEmitter(
    x: number,
    y: number,
    angle: { min: number; max: number },
  ) {
    const lifespan = 2500;
    const emitter = this.scene.add.particles(
      x,
      y,
      EffectsManager.CONFETTI_TEXTURE,
      {
        speed: { min: 150, max: 350 },
        angle,
        gravityY: 500,
        lifespan,
        quantity: 40,
        scale: { start: 0.8, end: 0.3 },
        alpha: { start: 1, end: 0 },
        rotate: {
          onEmit: (particle?: Phaser.GameObjects.Particles.Particle) => {
            const startAngle = Phaser.Math.Between(0, 360);
            const p = particle as unknown as {
              confettiStartAngle: number;
              confettiSpinDirection: number;
            };
            p.confettiStartAngle = startAngle;
            p.confettiSpinDirection = Phaser.Math.RND.pick([-1, 1]);
            return startAngle;
          },
          onUpdate: (
            particle: Phaser.GameObjects.Particles.Particle,
            _key: string,
            t: number,
          ) => {
            const p = particle as unknown as {
              confettiStartAngle: number;
              confettiSpinDirection: number;
            };
            return (
              p.confettiStartAngle +
              t * EffectsManager.CONFETTI_SPIN_DEGREES * p.confettiSpinDirection
            );
          },
        },
        tint: EffectsManager.CONFETTI_COLORS,
        emitting: false,
      },
    );
    emitter.setDepth(50);
    emitter.explode(40);

    this.scene.time.delayedCall(lifespan, () => emitter.destroy());
  }

  /** Dispara duas explosões de confete (esquerda e direita) para celebrar o sucesso em um placeholder */
  public playConfettiBurst(
    x: number,
    y: number,
    offset: number = 60,
    verticalOffset: number = 160,
  ) {
    this.ensureConfettiTexture();
    const burstY = y - verticalOffset;
    this.spawnConfettiEmitter(x - offset, burstY, { min: 190, max: 270 });
    this.spawnConfettiEmitter(x + offset, burstY, { min: 270, max: 350 });
  }

  private static readonly MUSIC_NOTE_TEXTURES = ["note01", "note02"];
  private static readonly MUSIC_NOTE_OFFSETS_X = [-60, 0, 60];
  private static readonly MUSIC_NOTE_DEPTH = 12;
  private static readonly MUSIC_NOTE_LEG_DURATION = 500;
  private static readonly MUSIC_NOTE_MAX_SPAWN_DELAY = 2500;

  /**
   * Spawns one note sprite that fades in, zig-zags upward, fades out at the
   * top, then respawns at the same point after a fresh random delay —
   * looping forever until the scene is torn down.
   */
  private spawnMusicNote(spawnX: number, spawnY: number) {
    const delay = Phaser.Math.Between(
      0,
      EffectsManager.MUSIC_NOTE_MAX_SPAWN_DELAY,
    );

    this.scene.time.delayedCall(delay, () => {
      const texture = Phaser.Math.RND.pick(EffectsManager.MUSIC_NOTE_TEXTURES);
      const note = this.scene.add.sprite(spawnX, spawnY, texture);
      note.setDepth(EffectsManager.MUSIC_NOTE_DEPTH);
      note.setScale(1.5);
      note.setAlpha(0);

      const zigzagDir = Phaser.Math.RND.pick([-1, 1]);
      const duration = EffectsManager.MUSIC_NOTE_LEG_DURATION;

      this.scene.tweens.chain({
        targets: note,
        tweens: [
          {
            alpha: 1,
            x: spawnX + 18 * zigzagDir,
            y: spawnY - 30,
            duration,
            ease: "Sine.easeOut",
          },
          {
            x: spawnX - 18 * zigzagDir,
            y: spawnY - 60,
            duration,
            ease: "Sine.easeInOut",
          },
          {
            x: spawnX + 10 * zigzagDir,
            y: spawnY - 95,
            alpha: 0,
            duration,
            ease: "Sine.easeIn",
          },
        ],
        onComplete: () => {
          note.destroy();
          this.spawnMusicNote(spawnX, spawnY);
        },
      });
    });
  }

  /** Kicks off 3 independently-looping music note animations, side by side above the given point. */
  public playMusicNotesLoop(
    centerX: number,
    centerY: number,
    verticalOffset: number = 160,
  ) {
    const spawnY = centerY - verticalOffset;
    EffectsManager.MUSIC_NOTE_OFFSETS_X.forEach((offsetX) => {
      this.spawnMusicNote(centerX + offsetX, spawnY);
    });
  }
}
