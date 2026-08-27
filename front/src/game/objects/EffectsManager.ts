import * as Phaser from "phaser";
import { EventBus } from "../../shared/events/event-bus";
import { AudioManager } from "../audio";

/**
 * EffectsManager encapsula transformações de câmera, filtros de cor e efeitos ambientais.
 */

export class EffectsManager {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private spotlightBeam: Phaser.GameObjects.Graphics | null = null;
  private spotlightVisible = false;
  private revealProgress = 1;
  private spotlightTargetX = 0;
  private spotlightTargetY = 0;
  private persistentCone: Phaser.GameObjects.Graphics | null = null;
  private persistentConeVisible = false;
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

  public initSpotlight() {
    this.spotlightBeam = this.scene.add.graphics();
    this.spotlightBeam.setDepth(15);
  }

  public initPersistentCone() {
    this.persistentCone = this.scene.add.graphics();
    this.persistentCone.setDepth(1000);
  }

  public showPersistentCone(px: number, py: number, color: number) {
    if (!this.persistentCone) return;

    this.persistentConeVisible = true;
    this.persistentCone.clear();

    const topHalfWidth = 18;
    const bottomHalfWidth = 650;
    const topOffsetY = -500;
    const bottomOffsetY = 1600;
    const bottomBulge = bottomHalfWidth * 0.12;

    this.persistentCone.fillStyle(color, 0.35);
    this.persistentCone.beginPath();
    this.persistentCone.moveTo(px - topHalfWidth, py + topOffsetY);
    this.persistentCone.lineTo(px + topHalfWidth, py + topOffsetY);
    this.persistentCone.lineTo(px + bottomHalfWidth, py + bottomOffsetY);
    this.persistentCone.lineTo(
      px + bottomHalfWidth * 0.2,
      py + bottomOffsetY + bottomBulge,
    );
    this.persistentCone.lineTo(px, py + bottomOffsetY + bottomBulge);
    this.persistentCone.lineTo(
      px - bottomHalfWidth * 0.2,
      py + bottomOffsetY + bottomBulge,
    );
    this.persistentCone.lineTo(px - bottomHalfWidth, py + bottomOffsetY);
    this.persistentCone.closePath();
    this.persistentCone.fillPath();
    this.persistentCone.setDepth(1000);
  }

  public hidePersistentCone() {
    this.persistentConeVisible = false;
    this.persistentCone?.clear();
  }

  public isPersistentConeVisible(): boolean {
    return this.persistentConeVisible;
  }

  public showSpotlightBeam(
    duration: number = 2000,
    revealDuration: number = 200,
    px: number = 0,
    py: number = 0,
  ) {
    this.spotlightTargetX = px;
    this.spotlightTargetY = py;
    this.spotlightVisible = true;
    this.revealProgress = 0;
    AudioManager.playSfx("sfx.puzzle.success", 0.7);

    this.scene.tweens.add({
      targets: this,
      revealProgress: 1,
      duration: revealDuration,
      ease: "Power2",
    });

    this.scene.time.delayedCall(duration, () => {
      this.scene.tweens.add({
        targets: this,
        revealProgress: 0,
        duration: revealDuration,
        ease: "Power2",
        onComplete: () => {
          this.spotlightVisible = false;
          this.spotlightBeam?.clear();
        },
      });
    });
  }

  private drawSpotlightBeam(px: number, py: number) {
    if (!this.spotlightBeam || !this.spotlightVisible) return;

    const beam = this.spotlightBeam;
    beam.clear();

    const topHalfWidth = 10;
    const bottomHalfWidth = 120;
    const topOffsetY = -500;
    const bottomOffsetY = 100;
    const bottomBulge = bottomHalfWidth * 0.12;

    const progress = this.revealProgress;
    const currentBottomY = Phaser.Math.Linear(
      topOffsetY,
      bottomOffsetY,
      progress,
    );
    const currentBulge = bottomBulge * progress;

    beam.fillStyle(0xffffff, 0.35 * progress);
    beam.beginPath();
    beam.moveTo(px - topHalfWidth, py + topOffsetY);
    beam.lineTo(px + topHalfWidth, py + topOffsetY);
    beam.lineTo(px + bottomHalfWidth, py + currentBottomY);
    beam.lineTo(px + bottomHalfWidth * 0.2, py + currentBottomY + currentBulge);
    beam.lineTo(px, py + currentBottomY + currentBulge * 1);
    beam.lineTo(px - bottomHalfWidth * 0.2, py + currentBottomY + currentBulge);
    beam.lineTo(px - bottomHalfWidth, py + currentBottomY);
    beam.closePath();
    beam.fillPath();
    beam.setDepth(1000);
  }

  /** Atualiza o spotlight (chamar a cada frame) */
  public updateSpotlight(_px: number, _py: number) {
    if (!this.spotlightVisible) return;
    this.drawSpotlightBeam(this.spotlightTargetX, this.spotlightTargetY);
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
}
