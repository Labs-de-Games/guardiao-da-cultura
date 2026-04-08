import * as Phaser from "phaser";
import { LayoutConfig } from "../../constants/LayoutConfig";

/**
 * BasePanel é uma classe base abstrata para todos os componentes de UI da UIScene.
 * Fornece funcionalidades comuns de visibilidade, animação, contrato de layout e input.
 */
export abstract class BasePanel extends Phaser.GameObjects.Container {
  protected _isVisible: boolean = false;
  protected bg!: Phaser.GameObjects.Rectangle;
  private keyListeners: { key: string; fn: () => void }[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.setVisible(false);
    this.setAlpha(0);
    scene.add.existing(this);
  }

  /** Contrato para reposicionamento responsivo */
  abstract layout(width: number, height: number): void;

  /** Fábrica Visual: Cria fundo padrão do sistema */
  protected createStandardBg(
    width: number,
    height: number,
    depth: number = 0,
  ): Phaser.GameObjects.Rectangle {
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.9);
    bg.setStrokeStyle(4, 0xffffff, 1);
    bg.setOrigin(0.5, 0); // Padrão para painéis de diálogo/topo
    bg.setDepth(depth);
    return bg;
  }

  /** Fábrica Visual: Cria dica de tecla padronizada */
  protected createKeyHint(
    text: string,
    color: string = LayoutConfig.COLORS.DANGER_RED,
  ): Phaser.GameObjects.Text {
    return this.scene.add
      .text(0, 0, text, {
        fontSize: "20px",
        color: color,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 1);
  }

  /** Input Manager: Registra tecla no sistema Phaser com cleanup automático */
  protected bindKey(key: string, callback: () => void) {
    const phaserKey = key.toUpperCase();
    this.scene.input.keyboard?.on(`keydown-${phaserKey}`, callback);
    this.keyListeners.push({ key: `keydown-${phaserKey}`, fn: callback });
  }

  private clearKeys() {
    for (const l of this.keyListeners) {
      this.scene.input.keyboard?.off(l.key, l.fn);
    }
    this.keyListeners = [];
  }

  /** Métodos de animação padrão */
  public show(duration: number = 160) {
    if (this._isVisible) return;
    this._isVisible = true;
    this.setVisible(true);

    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: duration,
      ease: "Quad.Out",
    });
  }

  public hide(duration: number = 120, onComplete?: () => void) {
    if (!this._isVisible) return;
    this._isVisible = false;

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: duration,
      ease: "Quad.In",
      onComplete: () => {
        this.setVisible(false);
        if (onComplete) onComplete();
      },
    });
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }

  public override destroy(fromScene?: boolean) {
    this.clearKeys();
    super.destroy(fromScene);
  }
}
