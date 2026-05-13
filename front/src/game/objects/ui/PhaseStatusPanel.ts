import * as Phaser from "phaser";
import { LayoutConfig } from "../../constants/LayoutConfig";
import { ScoringEvents } from "../../constants/ScoringEvents";
import type { ScoringPayload } from "../../types/ScoringTypes";
import type { QuestManager } from "../QuestManager";
import type { ScoreManager } from "../ScoreManager";

/**
 * Painel que exibe o status global da fase.
 * Inclui o título da fase, o progresso de missões/objetos (Top-Right)
 * e o contador de estrelas (Top-Left).
 */
export class PhaseStatusPanel extends Phaser.GameObjects.Container {
  private phaseTitle: string;
  private missionsTotal: number;
  private questManager: QuestManager;

  private scoreManager?: ScoreManager;

  private phasePanel: Phaser.GameObjects.Container;
  private missionsText: Phaser.GameObjects.Text;
  private objectsText: Phaser.GameObjects.Text;

  private starsPanel: Phaser.GameObjects.Container;
  private starsText: Phaser.GameObjects.Text;

  private readonly handleScoreUpdated = (payload: ScoringPayload) => {
    const rawStars = payload.totalStars;
    const stars = Number.isFinite(rawStars)
      ? Math.max(0, Math.floor(rawStars))
      : 0;
    this.starsText.setText(`${stars}`);
  };

  constructor(
    scene: Phaser.Scene,
    phaseTitle: string,
    missionsTotal: number,
    questManager: QuestManager,
  ) {
    super(scene, 0, 0);
    this.phaseTitle = phaseTitle;
    this.missionsTotal = missionsTotal;
    this.questManager = questManager;

    const padding = LayoutConfig.UI.PADDING;

    // 1. Painel de Fase (Top-Right)
    this.phasePanel = scene.add.container(0, 0);
    const bg = scene.add.rectangle(
      0,
      0,
      LayoutConfig.UI.PANEL_WIDTH,
      110,
      LayoutConfig.COLORS.STANDARD_BG,
      0.95,
    );
    bg.setOrigin(...LayoutConfig.ALIGN.TOP_RIGHT);
    bg.setStrokeStyle(
      LayoutConfig.UI.PANEL_BORDER_WIDTH,
      LayoutConfig.UI.PANEL_BORDER_COLOR,
      0.9,
    );

    const titleText = scene.add
      .text(-padding, padding, this.phaseTitle, {
        fontFamily: LayoutConfig.FONTS.TITLE,
        fontSize: LayoutConfig.FONTS.SIZES.METADATA,
        color: LayoutConfig.COLORS.WHITE,
      })
      .setOrigin(...LayoutConfig.ALIGN.TOP_RIGHT);

    this.missionsText = scene.add
      .text(-padding, padding + 34, "", {
        fontFamily: LayoutConfig.FONTS.BODY,
        fontSize: LayoutConfig.FONTS.SIZES.HINT,
        color: LayoutConfig.COLORS.WHITE,
      })
      .setOrigin(...LayoutConfig.ALIGN.TOP_RIGHT);

    this.objectsText = scene.add
      .text(-padding, padding + 58, "", {
        fontFamily: LayoutConfig.FONTS.BODY,
        fontSize: LayoutConfig.FONTS.SIZES.HINT,
        color: LayoutConfig.COLORS.WHITE,
      })
      .setOrigin(...LayoutConfig.ALIGN.TOP_RIGHT);

    this.phasePanel.add([bg, titleText, this.missionsText, this.objectsText]);

    this.starsPanel = scene.add.container(0, 0);
    const starIcon = scene.add
      .image(0, 0, "star")
      .setOrigin(...LayoutConfig.ALIGN.TOP_LEFT)
      .setScale(5);
    this.starsText = scene.add
      .text(starIcon.displayWidth + 10, 0, "0", {
        fontFamily: LayoutConfig.FONTS.TITLE,
        fontSize: LayoutConfig.FONTS.SIZES.TITLE_LARGE,
        color: LayoutConfig.COLORS.WHITE,
        fontStyle: LayoutConfig.FONTS.STYLES.BOLD,
        stroke: LayoutConfig.COLORS.BLACK,
        strokeThickness: 4,
      })
      .setOrigin(...LayoutConfig.ALIGN.TOP_LEFT);
    this.starsPanel.add([starIcon, this.starsText]);

    this.scoreManager = scene.registry.get("scoreManager") as
      | ScoreManager
      | undefined;
    if (this.scoreManager) {
      this.scoreManager.on(
        ScoringEvents.SCORE_UPDATED,
        this.handleScoreUpdated,
        this,
      );
      this.handleScoreUpdated(this.scoreManager.getPayload());
    }

    this.add([this.phasePanel, this.starsPanel]);
    scene.add.existing(this);
  }

  override destroy(fromScene?: boolean) {
    if (this.scoreManager) {
      this.scoreManager.off(
        ScoringEvents.SCORE_UPDATED,
        this.handleScoreUpdated,
        this,
      );
      this.scoreManager = undefined;
    }

    super.destroy(fromScene);
  }

  public layout(w: number, h: number) {
    const padding = LayoutConfig.UI.PADDING;
    
	this.phasePanel.setPosition(w - padding, padding);
    this.starsPanel.setPosition(padding + 20, padding);

    const fontScale = Math.min(w / 1920, h / 1080);
    this.starsText.setFontSize(
      Math.round(LayoutConfig.FONTS.SIZES.TITLE_LARGE * fontScale),
    );
    this.missionsText.setFontSize(
      Math.round(LayoutConfig.FONTS.SIZES.HINT * fontScale),
    );
    this.objectsText.setFontSize(
      Math.round(LayoutConfig.FONTS.SIZES.HINT * fontScale),
    );
  }

  public refresh() {
    const completed = this.questManager.getTotalCompletedMissions();
    const collected = this.questManager.getTotalCollectedCount();
    const totalReq = this.questManager.getTotalRequiredCount();

    this.missionsText.setText(`Missões ${completed}/${this.missionsTotal}`);
    this.objectsText.setText(`Objetos ${collected}/${totalReq}`);
  }
}
