import * as Phaser from "phaser";
import { LayoutConfig } from "../../constants/LayoutConfig";
import type { QuestManager } from "../QuestManager";

/**
 * Painel que exibe o status global da fase.
 * Inclui o título da fase, o progresso de missões/objetos (Top-Right)
 * e o contador de estrelas (Top-Left).
 */
export class PhaseStatusPanel extends Phaser.GameObjects.Container {
  private phaseTitle: string;
  private missionsTotal: number;
  private questManager: QuestManager;

  private phasePanel: Phaser.GameObjects.Container;
  private missionsText: Phaser.GameObjects.Text;
  private objectsText: Phaser.GameObjects.Text;

  private starsPanel: Phaser.GameObjects.Container;
  private starsText: Phaser.GameObjects.Text;

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
      0x000000,
      0.75,
    );
    bg.setOrigin(1, 0);
    bg.setStrokeStyle(3, 0xffffff, 0.9);

    const titleText = scene.add
      .text(-padding, padding, this.phaseTitle, {
        fontSize: "24px",
        color: LayoutConfig.COLORS.WHITE,
        fontStyle: "bold",
      })
      .setOrigin(1, 0);

    this.missionsText = scene.add
      .text(-padding, padding + 34, "", {
        fontSize: "18px",
        color: LayoutConfig.COLORS.WHITE,
      })
      .setOrigin(1, 0);

    this.objectsText = scene.add
      .text(-padding, padding + 58, "", {
        fontSize: "18px",
        color: LayoutConfig.COLORS.WHITE,
      })
      .setOrigin(1, 0);

    this.phasePanel.add([bg, titleText, this.missionsText, this.objectsText]);

    // 2. Painel de Estrelas (Top-Left)
    this.starsPanel = scene.add.container(0, 0);
    const starIcon = scene.add.image(0, 0, "star").setOrigin(0, 0).setScale(5);
    this.starsText = scene.add
      .text(starIcon.displayWidth + 10, 0, "0", {
        fontSize: "48px",
        color: LayoutConfig.COLORS.WHITE,
        fontStyle: "bold",
        stroke: LayoutConfig.COLORS.BLACK,
        strokeThickness: 4,
      })
      .setOrigin(0, 0);
    this.starsPanel.add([starIcon, this.starsText]);

    this.add([this.phasePanel, this.starsPanel]);
    scene.add.existing(this);
  }

  /**
   * Reposiciona os elementos de acordo com o tamanho da tela.
   */
  public layout(w: number, _h: number) {
    const padding = LayoutConfig.UI.PADDING;
    // root offset compensation in UIScene was -20
    this.phasePanel.setPosition(w - padding, padding);
    this.starsPanel.setPosition(padding + 20, padding);
  }

  /**
   * Atualiza os textos de progresso baseados no QuestManager.
   */
  public refresh() {
    const completed = this.questManager.getTotalCompletedMissions();
    const collected = this.questManager.getTotalCollectedCount();
    const totalReq = this.questManager.getTotalRequiredCount();

    this.missionsText.setText(`Missões ${completed}/${this.missionsTotal}`);
    this.objectsText.setText(`Objetos ${collected}/${totalReq}`);
    this.starsText.setText(`${completed}`);
  }
}
