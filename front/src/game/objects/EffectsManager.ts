import * as Phaser from "phaser";
import { AudioManager } from "../audio";

/**
 * EffectsManager encapsula transformações de câmera, filtros de cor e efeitos ambientais.
 */
export class EffectsManager {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private colorMatrix?: Phaser.FX.ColorMatrix;
  private vignette?: Phaser.FX.Vignette;
  private spotlightBeam: Phaser.GameObjects.Graphics | null = null;
  private spotlightVisible = false;
  private revealProgress = 1;
  private spotlightTargetX = 0;
  private spotlightTargetY = 0;

  static preload(_scene: Phaser.Scene) {
    // Sounds are now loaded via AudioManager/registry
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;

    if (this.camera.postFX) {
      //this.colorMatrix = this.camera.postFX.addColorMatrix();
      //this.vignette = this.camera.postFX.addVignette();
      //this.vignette.radius = 0.9;
      //this.vignette.strength = 0.6;
    }
  }

  public get vignetteEffect() {
    return this.vignette;
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

  /** Ajusta o nível de Grayscale (0 a 1) com transição suave */
  public setGrayscale(amount: number, duration: number = 1000) {
    if (!this.colorMatrix) return;

    const currentAmount = { val: amount };
    // Nota: Idealmente rastrearíamos o valor atual, mas para o protótipo
    // forçamos o valor final ou animamos se necessário.
    this.scene.tweens.add({
      targets: currentAmount,
      val: amount,
      duration: duration,
      ease: "Power2",
      onUpdate: () => {
        this.colorMatrix?.grayscale(currentAmount.val);
      },
    });
  }

  /** Efeito de Vinheta (Tweens o objeto externo) */
  public setVignette(
    vignette: Phaser.FX.Vignette | undefined,
    radius: number,
    duration: number = 500,
  ) {
    if (!vignette) return;
    this.scene.tweens.add({
      targets: vignette,
      radius: radius,
      duration: duration,
      ease: "Power2",
    });
  }

  /** Shake de câmera para feedback de erro/dano */
  public shake(duration: number = 200, intensity: number = 0.005) {
    this.camera.shake(duration, intensity);
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
    AudioManager.playSfx("sfx.puzzle.success", 0.5);

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
}
