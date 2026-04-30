import * as Phaser from "phaser";
import { type BadgeConfig, fetchBadges } from "../../../lib/badgesApi";
import { LayoutConfig } from "../../constants/LayoutConfig";

export class BadgeGalleryPanel extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private badgesContainer: Phaser.GameObjects.Container;
  private isVisible: boolean = false;
  private badges: BadgeConfig[] = [];
  private unlockedIds: string[] = [];

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.INVENTORY);
    this.setVisible(false);

    this.bg = scene.add.rectangle(0, 0, 1000, 650, 0x1a1a1a, 0.95);
    this.bg.setStrokeStyle(4, 0xd4af37, 1);
    this.bg.setOrigin(0.5);

    // Block interaction behind panel
    this.bg.setInteractive();

    this.titleText = scene.add
      .text(0, -280, "Galeria de Conquistas", {
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
      console.error("[BadgeGallery] Erro ao carregar badges", e);
    }
  }

  public refresh() {
    // Read local storage
    if (typeof window !== "undefined") {
      this.unlockedIds = JSON.parse(
        localStorage.getItem("unlocked_badges") || "[]",
      );
    }

    this.badgesContainer.removeAll(true);

    const startX = -350;
    const startY = -150;
    const spacingX = 230;
    const spacingY = 200;

    let col = 0;
    let row = 0;

    this.badges.forEach((badge) => {
      const isUnlocked = this.unlockedIds.includes(badge.id);

      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      const cardBg = this.scene.add.rectangle(
        x,
        y,
        200,
        160,
        isUnlocked ? 0x2a2a2a : 0x111111,
        1,
      );
      cardBg.setStrokeStyle(2, isUnlocked ? 0xd4af37 : 0x444444);

      const iconBg = this.scene.add.circle(
        x,
        y - 30,
        35,
        isUnlocked ? 0x000000 : 0x333333,
      );
      iconBg.setStrokeStyle(2, isUnlocked ? 0xd4af37 : 0x555555);

      const elements: Phaser.GameObjects.GameObject[] = [cardBg, iconBg];

      if (isUnlocked) {
        // Assume texture is loaded by Preloader, otherwise it shows a fallback
        const icon = this.scene.add
          .image(x, y - 30, badge.icon_key)
          .setScale(0.08);
        elements.push(icon);
      } else {
        const questionMark = this.scene.add
          .text(x, y - 30, "?", {
            fontSize: "32px",
            color: "#666666",
            fontStyle: "bold",
          })
          .setOrigin(0.5);
        elements.push(questionMark);
      }

      const nameText = this.scene.add
        .text(x, y + 25, badge.name, {
          fontSize: "18px",
          color: isUnlocked ? "#ffffff" : "#888888",
          fontStyle: "bold",
          align: "center",
          wordWrap: { width: 180 },
        })
        .setOrigin(0.5);

      const descText = this.scene.add
        .text(x, y + 55, badge.description, {
          fontSize: "14px",
          color: "#aaaaaa",
          align: "center",
          wordWrap: { width: 180 },
        })
        .setOrigin(0.5);

      elements.push(nameText, descText);

      if (!isUnlocked) {
        elements.forEach((e) => {
          if ("setAlpha" in e)
            (
              e as Phaser.GameObjects.GameObject & {
                setAlpha: (v: number) => void;
              }
            ).setAlpha(0.6);
        });
      }

      this.badgesContainer.add(elements);

      col++;
      if (col > 3) {
        col = 0;
        row++;
      }
    });
  }

  public layout(w: number, h: number) {
    this.setPosition(w / 2, h / 2);
  }

  public show() {
    this.refresh();
    this.setVisible(true);
    this.isVisible = true;

    this.setAlpha(0);
    this.setScale(0.95);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scale: 1,
      duration: 150,
      ease: "Quad.Out",
    });
  }

  public hide() {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.95,
      duration: 150,
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
