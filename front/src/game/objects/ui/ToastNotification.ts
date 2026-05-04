import * as Phaser from "phaser";
import { LayoutConfig } from "../../constants/LayoutConfig";

interface NotificationItem {
  message: string;
  duration: number;
  iconKey?: string;
}

/**
 * ToastNotification is a UI component for displaying ephemeral feedback.
 * Features a queue system to handle multiple notifications sequentially.
 */
export class ToastNotification extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private icon: Phaser.GameObjects.Image;
  private hideTimer: Phaser.Time.TimerEvent | null = null;
  private queue: NotificationItem[] = [];
  private isShowing: boolean = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.TOAST);
    this.setVisible(false);

    // Background panel
    this.bg = scene.add.rectangle(
      0,
      0,
      LayoutConfig.UI.TOAST.WIDTH,
      LayoutConfig.UI.TOAST.HEIGHT,
      0x000000,
      0.9,
    );
    this.bg.setStrokeStyle(3, 0xffffff, 0.8);
    this.bg.setOrigin(0.5);

    // Notification text
    this.text = scene.add
      .text(0, 0, "", {
        fontFamily: "Outfit, sans-serif",
        fontSize: "26px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 600, useAdvancedWrap: true },
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    // Icon (initially hidden)
    this.icon = scene.add.image(0, 0, "").setVisible(false);

    this.add([this.bg, this.icon, this.text]);
    scene.add.existing(this);
  }

  /**
   * Adjusts the notification positioning for responsiveness.
   */
  public layout(w: number, h: number) {
    const cx = w / 2;
    const y = Math.floor(h * 0.15); // Top 15% of the screen
    this.setPosition(cx, y);

    const maxW = Math.min(LayoutConfig.UI.TOAST.WIDTH, Math.floor(w * 0.9));
    this.bg.setSize(maxW, LayoutConfig.UI.TOAST.HEIGHT);
    this.text.setWordWrapWidth(maxW - 100, true);
  }

  /**
   * Shows a new notification or queues it if one is already visible.
   */
  public show(message: string, duration: number = 3500, iconKey?: string) {
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

    // Setup icon if provided
    if (iconKey && this.scene.textures.exists(iconKey)) {
      this.icon.setTexture(iconKey).setVisible(true);
      this.icon.setScale(0.12); // Base scale, adjusted for badge icons

      const gap = 20;
      const totalContentWidth = this.icon.displayWidth + gap + this.text.width;

      // Center the icon+text group inside the toast
      const startX = -totalContentWidth / 2;
      this.icon.setX(startX + this.icon.displayWidth / 2);
      this.text.setX(
        this.icon.x + this.icon.displayWidth / 2 + gap + this.text.width / 2,
      );
    } else {
      this.icon.setVisible(false);
      this.text.setX(0);
    }

    // Entrance Animation
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scale: 1,
      y: "+=10",
      duration: 300,
      ease: "Back.Out",
    });

    // Exit Timer
    this.hideTimer = this.scene.time.delayedCall(duration, () => this.hide());
  }

  private hide() {
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
