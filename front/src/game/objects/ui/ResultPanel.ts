import type * as Phaser from "phaser";
import { GameEvents } from "../../constants/GameEvents";
import { LayoutConfig } from "../../constants/LayoutConfig";
import { SceneNames } from "../../constants/SceneNames";
import { BasePanel } from "./BasePanel";
import type { QuizProgressTracker } from "./quiz/QuizProgressTracker";

export class ResultPanel extends BasePanel {
  private resultStarsContainer: Phaser.GameObjects.Container;
  private resultStars: Phaser.GameObjects.Image[] = [];

  private readonly resultStarsCount = 5;
  private readonly resultStarsSidePadding = 140;
  private readonly resultStarsGapRatio = 0.18;
  private readonly resultStarsTopPadding = 0;
  private readonly resultStarsOutlinePaddingX = 20; // Left/right padding
  private readonly resultStarsOutlinePaddingY = 100; // Top/bottom padding
  private resultStarsOutline: Phaser.GameObjects.Graphics | null = null;

  private readonly panelWidth = 1200;
  private readonly panelHeight = 800;

  private textGreeting: Phaser.GameObjects.Text;
  private textScore: Phaser.GameObjects.Text;
  private topPanel: Phaser.GameObjects.Container;
  private progressTracker: QuizProgressTracker | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.QUIZ || 2000);

    this.bg = this.createStandardBg(this.panelWidth, this.panelHeight);
    this.bg.setOrigin(0.5, 0.5);
    this.bg.setFillStyle(0x1a1a1a, 0.95);
    this.bg.setStrokeStyle(4, 0xffffff, 1);

    this.topPanel = this.scene.add
      .container(0, -this.bg.height / 2 + 120)
      .setSize(1150, 150);
    const topPanelBg = this.scene.add
      .rectangle(0, 0, 1150, 150, 0x000000)
      .setOrigin(0.5, 0.7)
      .setRounded(16);

    this.textGreeting = scene.add
      .text(-540, -80, "Parabéns!", {
        fontFamily: "Jockey One",
        fontSize: "48px",
        color: LayoutConfig.COLORS.GOLD,
        fontStyle: "bold",
      })
      .setOrigin(0, 0);

    this.textScore = scene.add
      .text(-540, -20, "Pontuação perfeita", {
        fontFamily: "Jocky One",
        fontSize: "32px",
        color: LayoutConfig.COLORS.WHITE,
        fontStyle: "bold",
      })
      .setOrigin(0, 0);

    this.resultStarsContainer = scene.add.container(
      0,
      -this.panelHeight / 2 + 310,
    );
    this.resultStarsOutline = this.scene.add.graphics();
    this.resultStarsContainer.addAt(this.resultStarsOutline, 0);
    this.createResultsStars();

    this.topPanel.add([topPanelBg, this.textGreeting, this.textScore]);

    this.add([this.bg, this.topPanel, this.resultStarsContainer]);

    this.bindKey("ESC", () => {
      if (this._isVisible) this.hide();
    });
  }

  public layout(w: number, h: number) {
    this.setPosition(w / 2, h / 2);
    this.layoutResultsStarsRow();
  }

  public showResults(
    score: number,
    total: number,
    progressTracker: QuizProgressTracker,
  ) {
    const required = Math.ceil(total * 0.7);
    const great = Math.ceil(total * 1);

    const passed = score >= required;

    console.log(score, required, great);

    this.textGreeting.setText("Resultad");
    // this.resultTitleText.setColor(passed ? "#4caf50" : "#f44336");
    // this.resultSummaryText.setText(`Você acertou ${score} de ${total}`);
    if (this.progressTracker) {
      this.topPanel.remove(this.progressTracker);
    }
    this.progressTracker = progressTracker;
    this.topPanel.add(progressTracker);

    this.positionResultsStarsContainer();
    this.updateResultsStars(score, total);
    this.layoutResultsStarsRow();

    this.show();
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
    const y =
      // this.resultSummaryText.y +
      // this.resultSummaryText.displayHeight +
      this.resultStarsTopPadding;
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
  }

  private computeQuizQuarters(
    correctAnswers: number,
    totalQuestions: number,
  ): number {
    const total = Math.max(0, Math.floor(totalQuestions));
    const correct = Math.min(Math.max(0, Math.floor(correctAnswers)), total);
    const accuracyPercent = total > 0 ? Math.floor((correct / total) * 100) : 0;
    return Math.min(4, Math.floor(accuracyPercent / 25));
  }

  private keyForQuarterFill(q: number): string {
    if (q >= 4) return "ui_star_full";
    if (q === 3) return "ui_star_3q";
    if (q === 2) return "ui_star_2q";
    return "ui_star_1q";
  }

  private updateResultsStars(score: number, total: number) {
    const gameScene = this.scene.scene.get(SceneNames.GAME) as unknown as {
      getScoringPayload?: () => {
        totalQuarters: number;
        quiz: { quartersEarned: number };
      };
    };

    const payload = gameScene.getScoringPayload?.();
    const currentTotalQuarters = payload?.totalQuarters ?? 0;
    const recordedQuizQuarters = payload?.quiz?.quartersEarned ?? 0;

    const quizQuartersNow = this.computeQuizQuarters(score, total);
    const effectiveTotalQuarters = Math.max(
      0,
      Math.min(
        20,
        currentTotalQuarters - recordedQuizQuarters + quizQuartersNow,
      ),
    );

    for (let i = 0; i < this.resultStarsCount; i++) {
      const quartersForStar = Math.max(
        0,
        Math.min(4, effectiveTotalQuarters - i * 4),
      );
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

  public override hide(duration: number = 200, onComplete?: () => void) {
    if (!this._isVisible) return;

    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.DIALOGUE_ENDED);

    super.hide(duration, onComplete);
  }
}
