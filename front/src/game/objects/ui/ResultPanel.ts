import type * as Phaser from "phaser";
import { GameEvents } from "../../constants/GameEvents";
import { LayoutConfig } from "../../constants/LayoutConfig";
import { SceneNames } from "../../constants/SceneNames";
import type { ScoreManager } from "../ScoreManager";
import { BasePanel } from "./BasePanel";
import type { QuizProgressTracker } from "./quiz/QuizProgressTracker";

export class ResultPanel extends BasePanel {
  private resultStarsContainer: Phaser.GameObjects.Container;
  private topContainer: Phaser.GameObjects.Container;
  private navButtonsContainer: Phaser.GameObjects.Container;
  private navButtonHome: Phaser.GameObjects.Container =
    this.scene.add.container(0, 0);
  private navButtonNext: Phaser.GameObjects.Container =
    this.scene.add.container(0, 0);
  private resultStars: Phaser.GameObjects.Image[] = [];

  private readonly resultStarsCount = 5;
  private readonly resultStarsSidePadding = 140;
  private readonly resultStarsGapRatio = 0.18;
  private readonly resultStarsTopPadding = 0;
  private readonly resultStarsOutlinePaddingX = 20;
  private readonly resultStarsOutlinePaddingY = 100;
  private resultStarsOutline: Phaser.GameObjects.Graphics | null = null;

  private readonly panelWidth = 1200;
  private readonly panelHeight = 800;

  private textGreeting: Phaser.GameObjects.Text;
  private textScore: Phaser.GameObjects.Text;
  private textCongrat: Phaser.GameObjects.Text;
  private textMessage: Phaser.GameObjects.Text;
  private selectedNavIndex: number = 1;
  private readonly navButtonWidth = 320;
  private readonly navButtonHeight = 80;
  private readonly navButtonGap = 30;
  private progressTracker: QuizProgressTracker | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.QUIZ || 2000);
    this.bg = this.createStandardBg(this.panelWidth, this.panelHeight);
    this.bg.setOrigin(0.5, 0.5);
    this.bg.setFillStyle(0x1a1a1a, 0.95);
    this.bg.setStrokeStyle(4, 0xffffff, 1);

    const topContainerBg = this.scene.add
      .rectangle(0, 0, 1150, 150, 0x000000)
      .setOrigin(0.5, 0.7)
      .setRounded(16);
    this.topContainer = this.scene.add
      .container(0, -this.bg.height / 2 + 120)
      .setSize(1150, 150);
    this.navButtonsContainer = this.scene.add
      .container(0, -this.bg.height / 2 + 700)
      .setSize(1150, 150);
    this.createNavButtons();

    this.textGreeting = scene.add
      .text(
        -this.topContainer.width / 2 + 35,
        -this.topContainer.height / 2 - 5,
        "Parabéns!",
        {
          fontFamily: "Jockey One",
          fontSize: "48px",
          color: LayoutConfig.COLORS.GOLD,
          fontStyle: "bold",
        },
      )
      .setOrigin(0, 0);
    this.textScore = scene.add
      .text(
        -this.topContainer.width / 2 + 35,
        -this.topContainer.height / 2 + 55,
        "Pontuação perfeita",
        {
          fontFamily: "Jocky One",
          fontSize: "32px",
          color: LayoutConfig.COLORS.WHITE,
          fontStyle: "bold",
        },
      )
      .setOrigin(0, 0);
    this.resultStarsContainer = scene.add.container(
      0,
      -this.topContainer.height / 2 - 15,
    );
    this.resultStarsOutline = this.scene.add.graphics();
    this.resultStarsContainer.addAt(this.resultStarsOutline, 0);
    this.createResultsStars();
    this.textCongrat = scene.add
      .text(0, 0, "Muito Bom", {
        fontFamily: "Jockey One",
        fontSize: "36px",
        color: LayoutConfig.COLORS.WHITE,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0.5);
    this.textMessage = scene.add
      .text(0, 0, "Continue assim", {
        fontFamily: "Jockey One",
        fontSize: "28px",
        color: LayoutConfig.COLORS.DISABLED_GREY,
        fontStyle: "normal",
      })
      .setOrigin(0.5, 0.5);
    this.resultStarsContainer.add([this.textCongrat, this.textMessage]);
    this.topContainer.add([topContainerBg, this.textGreeting, this.textScore]);
    this.add([
      this.bg,
      this.topContainer,
      this.resultStarsContainer,
      this.navButtonsContainer,
    ]);
    this.bindKey("ESC", () => {
      if (this._isVisible) this.hide();
    });
  }

  public layout(w: number, h: number) {
    this.setPosition(w / 2, h / 2);
    this.layoutResultsStarsRow();
  }

  public showResults(
    _score: number,
    _total: number,
    progressTracker: QuizProgressTracker,
    scoreManager: ScoreManager,
  ) {
    const payload = scoreManager.getPayload();
    if (!payload) {
      console.error("Failed to get scoring payload");
      return;
    }
    console.log("Scoring payload:", payload);
    this.textMessage.setText("Você está pronto para o próximo nível");
    switch (payload.rating) {
      case "mínimo":
        this.textGreeting.setText("Ok");
        this.textScore.setText("Performance mínima");
        this.textCongrat.setText("Podia ser melhor...");
        break;
      case "regular":
        this.textGreeting.setText("Ok");
        this.textScore.setText("Performance regular");
        this.textCongrat.setText("Regular");
        break;
      case "bom":
        this.textGreeting.setText("Parabéns!");
        this.textScore.setText("Boa performance");
        this.textCongrat.setText("Bom!");
        break;
      case "ótimo":
        this.textGreeting.setText("Parabéns!");
        this.textScore.setText("Ótima performance");
        this.textCongrat.setText("Muito Bom!");
        break;
      case "perfeito":
        this.textGreeting.setText("Parabéns!");
        this.textScore.setText("Performance perfeita");
        this.textCongrat.setText("Perfeito!");
        break;
      default:
        this.textGreeting.setText("Resultado");
        this.textScore.setText("Pontuação");
        this.textCongrat.setText("");
    }

    if (this.progressTracker) {
      this.topContainer.remove(this.progressTracker);
    }
    this.progressTracker = progressTracker;
    this.topContainer.add(progressTracker);
    this.positionResultsStarsContainer();
    this.updateResultsStars(payload);
    this.layoutResultsStarsRow();
    this.selectedNavIndex = 1;
    this.updateNavButtonsSelection();
    this.show();
  }

  public override show(duration: number = 160) {
    if (this._isVisible) return;
    super.show(duration);
    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.DIALOGUE_STARTED);
  }

  private createResultsStars() {
    for (let i = 0; i < this.resultStarsCount; i++) {
      const star = this.scene.add.image(0, 0, "ui_star_full").setScale(1);
      this.resultStars.push(star);
      this.resultStarsContainer.add(star);
    }
    this.layoutResultsStarsRow();
  }

  private positionResultsStarsContainer() {
    const y = this.resultStarsTopPadding - 50;
    this.resultStarsContainer.setPosition(0, y);
  }
  private layoutResultsStarsRow() {
    if (this.resultStars.length === 0) return;

    const tex = this.scene.textures.get("ui_star_full");
    const source = tex?.getSourceImage() as
      | { width: number; height: number }
      | undefined;
    const baseW = source?.width ?? 457;
    const baseH = source?.height ?? 457;
    const maxRowWidth = Math.max(
      0,
      this.panelWidth - this.resultStarsSidePadding * 2,
    );
    const denom =
      this.resultStarsCount +
      (this.resultStarsCount - 1) * this.resultStarsGapRatio;
    const targetW = denom > 0 ? maxRowWidth / denom : maxRowWidth;
    const gap = targetW * this.resultStarsGapRatio;
    const scale = baseW > 0 ? targetW / baseW : 1;
    const step = targetW + gap;
    const startX = -((this.resultStarsCount - 1) * step) / 2;
    for (let i = 0; i < this.resultStarsCount; i++) {
      const star = this.resultStars[i];
      if (!star) continue;
      star.setPosition(startX + i * step, 0);
      star.setScale(scale);
    }
    this.updateResultStarsOutline(baseW, baseH, scale, step, startX);
    this.positionResultTexts();
  }

  private updateResultStarsOutline(
    baseW: number,
    baseH: number,
    scale: number,
    step: number,
    startX: number,
  ) {
    if (!this.resultStarsOutline) return;

    this.resultStarsOutline.clear();
    const starW = baseW * scale;
    const starH = baseH * scale;
    const paddingX = this.resultStarsOutlinePaddingX;
    const paddingY = this.resultStarsOutlinePaddingY;
    const starLeftEdge = startX - starW / 2;
    const starRightEdge =
      startX + (this.resultStarsCount - 1) * step + starW / 2;
    const x = starLeftEdge - paddingX;
    const width = starRightEdge - starLeftEdge + 2 * paddingX;
    const starTopEdge = -starH / 2;
    const starBottomEdge = starH / 2;
    const y = starTopEdge - paddingY;
    const height = starBottomEdge - starTopEdge + 2 * paddingY;
    this.resultStarsOutline.lineStyle(4, LayoutConfig.COLORS.GOLD_HEX, 1);
    this.resultStarsOutline.strokeRoundedRect(x, y, width, height, 16);
    this.resultStarsOutline.setY(this.resultStarsOutline.y + 25);
  }

  private positionResultTexts() {
    if (!this.textCongrat || !this.textMessage || this.resultStars.length === 0)
      return;
    const star = this.resultStars[0];
    const starHeight = star.displayHeight;
    const textSpacing = 20; // Space between texts
    const starsBottom = starHeight / 2 + this.resultStarsOutlinePaddingY;
    this.textCongrat.setPosition(
      0,
      starsBottom + this.textCongrat.displayHeight / 2 - 50,
    );
    this.textMessage.setPosition(
      0,
      this.textCongrat.y +
        this.textCongrat.displayHeight / 2 +
        textSpacing +
        this.textMessage.displayHeight / 2,
    );
  }

  private keyForQuarterFill(q: number): string {
    if (q >= 4) return "ui_star_full";
    if (q === 3) return "ui_star_3q";
    if (q === 2) return "ui_star_2q";
    return "ui_star_1q";
  }

  private updateResultsStars(
    payload:
      | {
          totalQuarters: number;
          quiz: { quartersEarned: number };
        }
      | undefined,
  ) {
    const totalQuarters = payload?.totalQuarters ?? 0;
    for (let i = 0; i < this.resultStarsCount; i++) {
      const quartersForStar = Math.max(0, Math.min(4, totalQuarters - i * 4));
      const star = this.resultStars[i];
      if (!star) continue;

      if (quartersForStar <= 0) {
        star
          .setTexture("ui_star_full")
          .setTint(LayoutConfig.COLORS.DARK_STAR_TINT)
          .setAlpha(0.5);
        continue;
      }
      star
        .setTexture(this.keyForQuarterFill(quartersForStar))
        .clearTint()
        .setAlpha(1);
    }
  }

  private createNavButtons() {
    const containerWidth = this.navButtonWidth * 2 + this.navButtonGap;
    const startX = -containerWidth / 2 + this.navButtonWidth / 2;
    this.navButtonHome = this.createNavButton(
      "Home",
      LayoutConfig.COLORS.WHITE_HEX,
    );
    this.navButtonNext = this.createNavButton(
      "Próximo",
      LayoutConfig.COLORS.GOLD_HEX,
    );
    this.navButtonHome.setPosition(startX, 0);
    this.navButtonNext.setPosition(
      startX + this.navButtonWidth + this.navButtonGap,
      0,
    );
    this.navButtonsContainer.add([this.navButtonHome, this.navButtonNext]);
    this.setupNavButtonKeyboard();
  }

  private drawButtonBg(bg: Phaser.GameObjects.Graphics, color: number) {
    bg.clear();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(
      -this.navButtonWidth / 2,
      -this.navButtonHeight / 2,
      this.navButtonWidth,
      this.navButtonHeight,
      12,
    );
  }

  private createNavButton(
    text: string,
    color: number,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const bg = this.scene.add.graphics();
    this.drawButtonBg(bg, color);
    const label = this.scene.add
      .text(0, 0, text, {
        fontFamily: "Inter",
        fontSize: "24px",
        color: LayoutConfig.COLORS.BLACK,
      })
      .setOrigin(0.5);
    container.add([bg, label]);
    return container;
  }

  private setupNavButtonKeyboard() {
    this.scene.input.keyboard?.on("keydown-LEFT", () =>
      this.selectPrevNavButton(),
    );
    this.scene.input.keyboard?.on("keydown-RIGHT", () =>
      this.selectNextNavButton(),
    );
    this.scene.input.keyboard?.on("keydown-A", () =>
      this.selectPrevNavButton(),
    );
    this.scene.input.keyboard?.on("keydown-D", () =>
      this.selectNextNavButton(),
    );
    this.scene.input.keyboard?.on("keydown-SPACE", () =>
      this.activateSelectedNavButton(),
    );
    this.scene.input.keyboard?.on("keydown-ENTER", () =>
      this.activateSelectedNavButton(),
    );
  }

  private selectPrevNavButton() {
    if (!this._isVisible) return;
    if (this.selectedNavIndex > 0) {
      this.selectedNavIndex--;
      this.updateNavButtonsSelection();
    }
  }

  private selectNextNavButton() {
    if (!this._isVisible) return;
    if (this.selectedNavIndex < 1) {
      this.selectedNavIndex++;
      this.updateNavButtonsSelection();
    }
  }

  private updateNavButtonsSelection() {
    const homeBg = this.navButtonHome.getAt(0) as Phaser.GameObjects.Graphics;
    const navBg = this.navButtonNext.getAt(0) as Phaser.GameObjects.Graphics;

    this.navButtonHome.setScale(this.selectedNavIndex === 0 ? 1.1 : 1);
    this.drawButtonBg(
      homeBg,
      this.selectedNavIndex === 0
        ? LayoutConfig.COLORS.WHITE_HEX
        : LayoutConfig.COLORS.WHITE_DARK_HEX,
    );
    this.navButtonNext.setScale(this.selectedNavIndex === 1 ? 1.1 : 1);
    this.drawButtonBg(
      navBg,
      this.selectedNavIndex === 0
        ? LayoutConfig.COLORS.GOLD_DARK_HEX
        : LayoutConfig.COLORS.GOLD_HEX,
    );
  }

  private activateSelectedNavButton() {
    if (!this._isVisible) return;
    console.log(
      `Nav button ${this.selectedNavIndex === 0 ? "home" : "next"} activated`,
    );
  }

  public override hide(duration: number = 200, onComplete?: () => void) {
    if (!this._isVisible) return;
    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.DIALOGUE_ENDED);
    super.hide(duration, onComplete);
  }
}
