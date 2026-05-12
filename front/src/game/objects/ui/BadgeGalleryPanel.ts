import type * as Phaser from "phaser";
import {
  type BadgeConfig,
  fetchBadges,
  fetchUserBadges,
} from "../../../lib/badgesApi";
import { LayoutConfig } from "../../constants/LayoutConfig";
import { BasePanel } from "./BasePanel";

export class BadgeGalleryPanel extends BasePanel {
  private currentFontScale: number = 1;
  private titleText!: Phaser.GameObjects.Text;
  private badgesContainer: Phaser.GameObjects.Container;
  private badges: BadgeConfig[] = [];
  private unlockedIds: string[] = [];

  private readonly CARD_WIDTH = 200;
  private readonly CARD_HEIGHT = 160;
  private readonly COLS = 4;
  private readonly SPACING_X = 230;
  private readonly SPACING_Y = 200;
  private readonly panelWidth = 1000;
  private readonly panelHeight = 650;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.INVENTORY);

    this.bg = this.createStandardBg(this.panelWidth, this.panelHeight);
    this.bg.setOrigin(...LayoutConfig.ALIGN.CENTER);

    this.titleText = scene.add
      .text(0, -this.panelHeight / 2 + 40, "Galeria de Conquistas", {
        fontFamily: LayoutConfig.FONTS.TITLE,
        fontSize: LayoutConfig.FONTS.SIZES.TITLE,
        color: LayoutConfig.COLORS.GOLD,
        fontStyle: LayoutConfig.FONTS.STYLES.BOLD,
      })
      .setOrigin(...LayoutConfig.ALIGN.CENTER);

    const closeBtn = scene.add
      .text(this.panelWidth / 2 - 30, -this.panelHeight / 2 + 40, "X", {
        fontFamily: LayoutConfig.FONTS.BODY,
        fontSize: LayoutConfig.FONTS.SIZES.TITLE,
        color: LayoutConfig.COLORS.WHITE,
        fontStyle: LayoutConfig.FONTS.STYLES.BOLD,
      })
      .setOrigin(...LayoutConfig.ALIGN.CENTER)
      .setInteractive({ useHandCursor: true });

    closeBtn.on("pointerdown", () => this.hide());

    this.badgesContainer = scene.add.container(0, 0);

    this.add([this.bg, this.titleText, closeBtn, this.badgesContainer]);

    this.bindKey("ESC", () => this.hide());

    this.loadData();
  }

  public layout(w: number, h: number) {
    this.setPosition(w / 2, h / 2);
    this.currentFontScale = this.getFontScale(w, h);

    this.applyScaledFontSize(
      this.titleText,
      LayoutConfig.FONTS.SIZES.TITLE,
      w,
      h,
    );
  }

  private async loadData() {
    try {
      this.badges = await fetchBadges();
      await this.syncUnlockedFromServer();
      this.refresh();
    } catch (e) {
      console.error("[BadgeGallery] Error loading badges", e);
      this.unlockedIds = [];
      this.refresh();
    }
  }

  private async syncUnlockedFromServer() {
    try {
      const userBadges = await fetchUserBadges();
      this.unlockedIds = userBadges.map((ub) => ub.badgeId);
    } catch {
      this.unlockedIds = [];
    }
  }

  public refresh() {
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

  private createBadgeCard(
    x: number,
    y: number,
    badge: BadgeConfig,
    isUnlocked: boolean,
  ) {
    const cardElements: Phaser.GameObjects.GameObject[] = [];

    const cardBg = this.scene.add.rectangle(
      x,
      y,
      this.CARD_WIDTH,
      this.CARD_HEIGHT,
      isUnlocked
        ? LayoutConfig.COLORS.CARD_BG_UNLOCKED
        : LayoutConfig.COLORS.CARD_BG_LOCKED,
      1,
    );
    cardBg.setStrokeStyle(
      2,
      isUnlocked
        ? LayoutConfig.COLORS.GOLD_HEX
        : LayoutConfig.COLORS.CARD_STROKE_LOCKED,
    );
    cardElements.push(cardBg);

    const iconBg = this.scene.add.circle(
      x,
      y - 30,
      38,
      isUnlocked
        ? LayoutConfig.COLORS.BLACK_HEX
        : LayoutConfig.COLORS.ICON_CIRCLE_LOCKED,
    );
    iconBg.setStrokeStyle(
      2,
      isUnlocked
        ? LayoutConfig.COLORS.GOLD_HEX
        : LayoutConfig.COLORS.ICON_STROKE_LOCKED,
    );
    cardElements.push(iconBg);

    if (isUnlocked && this.scene.textures.exists(badge.icon_key)) {
      const icon = this.scene.add
        .image(x, y - 30, badge.icon_key)
        .setScale(0.09);
      cardElements.push(icon);
    } else {
      const mystery = this.scene.add
        .text(x, y - 30, "?", {
          fontFamily: LayoutConfig.FONTS.BODY,
          fontSize: LayoutConfig.FONTS.SIZES.TITLE,
          color: LayoutConfig.COLORS.TEXT_MUTED,
          fontStyle: LayoutConfig.FONTS.STYLES.BOLD,
        })
        .setOrigin(...LayoutConfig.ALIGN.CENTER);
      cardElements.push(mystery);
    }

    const nameText = this.scene.add
      .text(x, y + 25, badge.name, {
        fontFamily: LayoutConfig.FONTS.BODY,
        fontSize: Math.round(
          LayoutConfig.FONTS.SIZES.HINT * this.currentFontScale,
        ),
        fontStyle: LayoutConfig.FONTS.STYLES.BOLD,
        color: isUnlocked
          ? LayoutConfig.COLORS.WHITE
          : LayoutConfig.COLORS.TEXT_DIM,
        align: LayoutConfig.ALIGN.TEXT_CENTER,
        wordWrap: { width: 180 },
      })
      .setOrigin(...LayoutConfig.ALIGN.CENTER);
    cardElements.push(nameText);

    const descText = this.scene.add
      .text(x, y + 55, badge.description, {
        fontFamily: LayoutConfig.FONTS.BODY,
        fontSize: Math.round(
          LayoutConfig.FONTS.SIZES.SMALL * this.currentFontScale,
        ),
        color: isUnlocked
          ? LayoutConfig.COLORS.DISABLED_GREY
          : LayoutConfig.COLORS.TEXT_MUTED,
        align: LayoutConfig.ALIGN.TEXT_CENTER,
        wordWrap: { width: 180 },
      })
      .setOrigin(...LayoutConfig.ALIGN.CENTER);
    cardElements.push(descText);

    this.badgesContainer.add(cardElements);
  }

  public async show() {
    await this.syncUnlockedFromServer();
    this.refresh();
    this.setVisible(true);

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
      },
    });
  }

  public get visibleState(): boolean {
    return this.isVisible;
  }
}
