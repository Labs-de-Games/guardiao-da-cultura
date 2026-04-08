import * as Phaser from "phaser";
import { LayoutConfig } from "../../constants/LayoutConfig";

/**
 * Componente de notificação efêmera (Toast).
 * Utilizado para feedbacks rápidos como "Missão Concluída".
 */
export class ToastNotification extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private hideTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.TOAST);
    this.setVisible(false);

    this.bg = scene.add.rectangle(
      0,
      0,
      LayoutConfig.UI.TOAST.WIDTH,
      LayoutConfig.UI.TOAST.HEIGHT,
      0x000000,
      0.85,
    );
    this.bg.setStrokeStyle(4, 0xffffff, 0.95);
    this.bg.setOrigin(0.5);

    this.text = scene.add
      .text(0, 0, "", {
        fontSize: "28px",
        color: LayoutConfig.COLORS.WHITE,
        align: "center",
        wordWrap: { width: 800, useAdvancedWrap: true },
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    this.add([this.bg, this.text]);
    scene.add.existing(this);
  }

  /**
   * Ajusta o posicionamento e largura do toast para ser responsivo.
   */
  public layout(w: number, h: number) {
    const cx = w / 2;
    const y = Math.max(90, Math.floor(h * 0.16));
    this.setPosition(cx, y);

    // Mantém a largura responsiva em telas pequenas
    const maxW = Math.min(860, Math.floor(w * 0.92));
    this.bg.setSize(maxW, 120);
    this.text.setWordWrapWidth(Math.max(240, maxW - 60), true);
  }

  /**
   * Exibe o toast com uma mensagem e duração específica.
   */
  public show(message: string, duration: number = 3200) {
    // Cancela timer anterior se existir
    if (this.hideTimer) {
      this.hideTimer.remove(false);
      this.hideTimer = null;
    }

    this.text.setText(message);
    this.setVisible(true);
    this.setAlpha(0);
    this.setScale(0.98);

    // Animação de Entrada
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scale: 1,
      duration: 180,
      ease: "Quad.Out",
    });

    // Timer para saída
    this.hideTimer = this.scene.time.delayedCall(duration, () => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 220,
        ease: "Quad.In",
        onComplete: () => {
          this.setVisible(false);
          this.hideTimer = null;
        },
      });
    });
  }
}
