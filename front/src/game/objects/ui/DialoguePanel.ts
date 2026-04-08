import type * as Phaser from "phaser";
import { GameEvents } from "../../constants/GameEvents";
import { LayoutConfig } from "../../constants/LayoutConfig";
import { SceneNames } from "../../constants/SceneNames";
import { BasePanel } from "./BasePanel";

/**
 * DialoguePanel gerencia a exibição de textos de diálogo (simples ou multi-linhas).
 */
export class DialoguePanel extends BasePanel {
  private lines: string[] = [];
  private currentLineIndex: number = 0;
  private onComplete: (() => void) | null = null;

  private contentText: Phaser.GameObjects.Text;
  private continuePrompt: Phaser.GameObjects.Text;
  private escHint: Phaser.GameObjects.Text;
  private nextIndicator: Phaser.GameObjects.Text;

  private readonly panelWidth = 1200;
  private readonly minPanelHeight = 160;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.DIALOGUE || 1000);

    // Fundo Padronizado
    this.bg = this.createStandardBg(this.panelWidth, this.minPanelHeight);

    this.contentText = scene.add
      .text(0, 0, "", {
        fontSize: "32px",
        color: LayoutConfig.COLORS.WHITE,
        wordWrap: { width: this.panelWidth - 100, useAdvancedWrap: true },
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0);

    this.continuePrompt = scene.add
      .text(0, 0, "", {
        fontSize: "24px",
        color: LayoutConfig.COLORS.SUCCESS_GREEN || "#00ff00",
        fontStyle: "bold",
      })
      .setOrigin(1, 1);

    // Hint Padronizado
    this.escHint = this.createKeyHint("ESC para fechar");
    this.escHint.setOrigin(0, 1);

    this.nextIndicator = scene.add
      .text(0, 0, "▼", {
        fontSize: "24px",
        color: LayoutConfig.COLORS.SUCCESS_GREEN || "#00ff00",
      })
      .setOrigin(0.5);

    this.add([
      this.bg,
      this.contentText,
      this.continuePrompt,
      this.escHint,
      this.nextIndicator,
    ]);

    // Input Nativo
    this.bindKey("SPACE", () => this.nextLine());
    this.bindKey("ENTER", () => this.nextLine());
    this.bindKey("ESC", () => {
      this.onComplete = null;
      this.hide();
    });

    // Animação do indicador
    scene.tweens.add({
      targets: this.nextIndicator,
      y: "+=10",
      duration: 600,
      yoyo: true,
      repeat: -1,
    });
  }

  public showDialogue(lines: string[], onComplete?: () => void) {
    this.lines = lines;
    this.currentLineIndex = 0;
    this.onComplete = onComplete || null;

    this.updateContent();
    this.show();
  }

  public override show() {
    if (this._isVisible) return;
    super.show();

    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.DIALOGUE_STARTED);
  }

  public override hide(duration: number = 200, onComplete?: () => void) {
    if (!this._isVisible) return;

    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.DIALOGUE_ENDED);

    super.hide(duration, () => {
      if (onComplete) onComplete();
      if (this.onComplete) {
        const cb = this.onComplete;
        this.onComplete = null;
        cb();
      }
    });
  }

  public layout(w: number, h: number) {
    const bottomY = h - 60;
    this.setPosition(w / 2, bottomY - this.bg.displayHeight);
    this.bg.setPosition(0, 0);
    this.updateDialogDimensions();
  }

  private updateContent() {
    const line = this.lines[this.currentLineIndex];
    this.contentText.setText(line);

    const isLastLine = this.currentLineIndex === this.lines.length - 1;
    this.continuePrompt.setText(
      isLastLine ? "ESPAÇO para fechar" : "ESPAÇO para continuar",
    );
    this.nextIndicator.setVisible(!isLastLine);

    this.updateDialogDimensions();
  }

  private updateDialogDimensions() {
    const textPadding = 40;
    const controlsPadding = 60;
    const textHeight = this.contentText.displayHeight;

    const targetHeight = Math.max(
      this.minPanelHeight,
      textHeight + textPadding + controlsPadding,
    );
    this.bg.setSize(this.panelWidth, targetHeight);

    this.contentText.setPosition(0, textPadding);

    const bw = this.panelWidth;
    const bh = targetHeight;
    this.continuePrompt.setPosition(bw / 2 - 30, bh - 20);
    this.escHint.setPosition(-bw / 2 + 30, bh - 20);
    this.nextIndicator.setPosition(bw / 2 - 30, bh - 50);
  }

  private nextLine() {
    if (!this._isVisible) return;
    this.currentLineIndex++;
    if (this.currentLineIndex >= this.lines.length) {
      this.hide();
    } else {
      this.updateContent();
    }
  }
}
