import type * as Phaser from "phaser";
import { LayoutConfig } from "../../constants/LayoutConfig";
import { BasePanel } from "./BasePanel";

interface NotificationItem {
  message: string;
  duration: number;
  iconKey?: string;
}

/**
 * ToastNotification is a UI component for displaying ephemeral feedback.
 * Features a queue system to handle multiple notifications sequentially.
 */
export class ToastNotification extends BasePanel {
  private text: Phaser.GameObjects.Text;
  private icon: Phaser.GameObjects.Image;
  private hideTimer: Phaser.Time.TimerEvent | null = null;
  private queue: NotificationItem[] = [];
  private isShowing: boolean = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.TOAST);

    this.bg = this.createStandardBg(
      LayoutConfig.UI.TOAST.WIDTH,
      LayoutConfig.UI.TOAST.HEIGHT,
    );
    this.bg.setOrigin(...LayoutConfig.ALIGN.CENTER);

    this.text = scene.add
      .text(0, 0, "", {
        fontFamily: LayoutConfig.FONTS.BODY,
        fontSize: LayoutConfig.FONTS.SIZES.BODY,
        color: LayoutConfig.COLORS.WHITE,
        align: LayoutConfig.ALIGN.TEXT_CENTER,
        wordWrap: { width: 600, useAdvancedWrap: true },
        lineSpacing: 4,
      })
      .setOrigin(...LayoutConfig.ALIGN.CENTER);

    this.icon = scene.add.image(0, 0, "").setVisible(false);

    this.add([this.bg, this.icon, this.text]);
  }

  public override destroy(fromScene?: boolean) {
    if (this.hideTimer) {
      this.hideTimer.remove();
      this.hideTimer = null;
    }
    super.destroy(fromScene);
  }

  /**
   * Adjusts the notification positioning for responsiveness.
   */
  public layout(w: number, h: number) {
    const cx = w / 2;
    const y = Math.floor(h * 0.15);
    this.setPosition(cx, y);

    const maxW = Math.min(LayoutConfig.UI.TOAST.WIDTH, Math.floor(w * 0.9));
    this.bg.setSize(maxW, LayoutConfig.UI.TOAST.HEIGHT);
    this.text.setWordWrapWidth(maxW - 100, true);

    this.applyScaledFontSize(this.text, LayoutConfig.FONTS.SIZES.BODY, w, h);
  }

  /**
   * Shows a new notification or queues it if one is already visible.
   */
  public showToast(message: string, duration: number = 3500, iconKey?: string) {
    if (this.isShowing) {
      this.queue.push({ message, duration, iconKey });
      return;
    }

    this.processShow(message, duration, iconKey);
  }

  private processShow(message: string, duration: number, iconKey?: string) {
    this.isShowing = true;
    this.text.setText(message);
    this.setVisible(true);
    this.setAlpha(0);
    this.setScale(0.95);

    if (iconKey && this.scene.textures.exists(iconKey)) {
      this.icon.setTexture(iconKey).setVisible(true);
      this.icon.setScale(0.12);

      const gap = 20;
      const totalContentWidth = this.icon.displayWidth + gap + this.text.width;

      const startX = -totalContentWidth / 2;
      this.icon.setX(startX + this.icon.displayWidth / 2);
      this.text.setX(
        this.icon.x + this.icon.displayWidth / 2 + gap + this.text.width / 2,
      );
    } else {
      this.icon.setVisible(false);
      this.text.setX(0);
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scale: 1,
      y: "+=10",
      duration: 300,
      ease: "Back.Out",
    });

    this.hideTimer = this.scene.time.delayedCall(duration, () =>
      this.hideToast(),
    );
  }

  private hideToast() {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.95,
      y: "-=10",
      duration: 250,
      ease: "Quad.In",
      onComplete: () => {
        this.setVisible(false);
        this.isShowing = false;
        this.hideTimer = null;
        this.checkQueue();
      },
    });
  }

  private checkQueue() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        this.processShow(next.message, next.duration, next.iconKey);
      }
    }
  }
}
