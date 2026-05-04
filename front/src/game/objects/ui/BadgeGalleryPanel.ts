import * as Phaser from "phaser";
import { type BadgeConfig, fetchBadges } from "../../../lib/badgesApi";
import { LayoutConfig } from "../../constants/LayoutConfig";

/**
 * UI Panel that displays all available badges and their unlock status.
 */
export class BadgeGalleryPanel extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private badgesContainer: Phaser.GameObjects.Container;
  private isVisible: boolean = false;
  private badges: BadgeConfig[] = [];
  private unlockedIds: string[] = [];

  // Layout Constants
  private readonly CARD_WIDTH = 200;
  private readonly CARD_HEIGHT = 160;
  private readonly COLS = 4;
  private readonly SPACING_X = 230;
  private readonly SPACING_Y = 200;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.INVENTORY);
    this.setVisible(false);

    // Dark overlay background
    this.bg = scene.add.rectangle(0, 0, 1000, 650, 0x111111, 0.95);
    this.bg.setStrokeStyle(4, 0xd4af37, 1);
    this.bg.setOrigin(0.5);
    this.bg.setInteractive(); // Block clicks through panel

    this.titleText = scene.add
      .text(0, -280, "Galeria de Conquistas", {
        fontFamily: "Outfit, sans-serif",
        fontSize: "36px",
        color: "#D4AF37",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const closeBtn = scene.add
      .text(460, -280, "X", {
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    closeBtn.on("pointerdown", () => this.hide());

    this.badgesContainer = scene.add.container(0, 0);

    this.add([this.bg, this.titleText, closeBtn, this.badgesContainer]);
    scene.add.existing(this);

    this.loadData();
  }

  private async loadData() {
    try {
      this.badges = await fetchBadges();
      this.refresh();
    } catch (e) {
      console.error("[BadgeGallery] Error loading badges", e);
    }
  }

  /**
   * Re-renders the badge grid based on current unlock status.
   */
  public refresh() {
    this.syncUnlockedStatus();
    this.badgesContainer.removeAll(true);

    const startX = -((this.COLS - 1) * this.SPACING_X) / 2;
    const startY = -150;

    this.badges.forEach((badge, index) => {
      const col = index % this.COLS;
      const row = Math.floor(index / this.COLS);

      const x = startX + col * this.SPACING_X;
      const y = startY + row * this.SPACING_Y;

      const isUnlocked = this.unlockedIds.includes(badge.id);
      this.createBadgeCard(x, y, badge, isUnlocked);
    });
  }

  private syncUnlockedStatus() {
    if (typeof window !== "undefined") {
      try {
        this.unlockedIds = JSON.parse(
          localStorage.getItem("unlocked_badges") || "[]",
        );
      } catch (e) {
        this.unlockedIds = [];
      }
    }
  }

  /**
   * Creates a single badge card with icon and description.
   */
  private createBadgeCard(
    x: number,
    y: number,
    badge: BadgeConfig,
    isUnlocked: boolean,
  ) {
    const cardElements: Phaser.GameObjects.GameObject[] = [];

    // Card Background
    const cardBg = this.scene.add.rectangle(
      x,
      y,
      this.CARD_WIDTH,
      this.CARD_HEIGHT,
      isUnlocked ? 0x222222 : 0x0a0a0a,
      1,
    );
    cardBg.setStrokeStyle(2, isUnlocked ? 0xd4af37 : 0x333333);
    cardElements.push(cardBg);

    // Icon Circle
    const iconBg = this.scene.add.circle(
      x,
      y - 30,
      38,
      isUnlocked ? 0x000000 : 0x1a1a1a,
    );
    iconBg.setStrokeStyle(2, isUnlocked ? 0xd4af37 : 0x444444);
    cardElements.push(iconBg);

    // Badge Icon or Mystery Mark
    if (isUnlocked && this.scene.textures.exists(badge.icon_key)) {
      const icon = this.scene.add
        .image(x, y - 30, badge.icon_key)
        .setScale(0.09);
      cardElements.push(icon);
    } else {
      const mystery = this.scene.add
        .text(x, y - 30, "?", {
          fontSize: "36px",
          color: "#444444",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      cardElements.push(mystery);
    }

    // Badge Name
    const nameText = this.scene.add
      .text(x, y + 25, badge.name, {
        fontFamily: "Outfit",
        fontSize: "18px",
        fontStyle: "bold",
        color: isUnlocked ? "#ffffff" : "#666666",
        align: "center",
        wordWrap: { width: 180 },
      })
      .setOrigin(0.5);
    cardElements.push(nameText);

    // Badge Description
    const descText = this.scene.add
      .text(x, y + 55, badge.description, {
        fontFamily: "Outfit",
        fontSize: "13px",
        color: isUnlocked ? "#aaaaaa" : "#444444",
        align: "center",
        wordWrap: { width: 180 },
      })
      .setOrigin(0.5);
    cardElements.push(descText);

    this.badgesContainer.add(cardElements);
  }

  public layout(w: number, h: number) {
    this.setPosition(w / 2, h / 2);
  }

  public show() {
    this.refresh();
    this.setVisible(true);
    this.isVisible = true;

    this.setAlpha(0);
    this.setScale(0.9);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scale: 1,
      duration: 250,
      ease: "Back.Out",
    });
  }

  public hide() {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.9,
      duration: 200,
      ease: "Quad.In",
      onComplete: () => {
        this.setVisible(false);
        this.isVisible = false;
      },
    });
  }

  public get visibleState(): boolean {
    return this.isVisible;
  }
}
