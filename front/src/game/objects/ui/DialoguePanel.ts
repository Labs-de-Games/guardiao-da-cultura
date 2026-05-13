import * as Phaser from "phaser";
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
  private ignoreNextConfirm: boolean = false;

  private mode: "dialogue" | "confirmation" = "dialogue";
  private confirmMessage: string = "";
  private confirmSelectedIndex: number = 0;
  private onConfirmYes: (() => void) | null = null;
  private onConfirmNo: (() => void) | null = null;

  private contentText: Phaser.GameObjects.Text;
  private continuePrompt: Phaser.GameObjects.Text;
  private escHint: Phaser.GameObjects.Text;
  private nextIndicator: Phaser.GameObjects.Text;

  private confirmOptionTexts: [
    Phaser.GameObjects.Text,
    Phaser.GameObjects.Text,
  ];

  private readonly panelWidth = 1200;
  private readonly minPanelHeight = 160;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.DIALOGUE || 1000);

    // Standard background
    this.bg = this.createStandardBg(this.panelWidth, this.minPanelHeight);

    this.contentText = scene.add
      .text(0, 0, "", {
        fontFamily: LayoutConfig.FONTS.BODY,
        fontSize: LayoutConfig.FONTS.SIZES.BODY,
        color: LayoutConfig.COLORS.WHITE,
        wordWrap: { width: this.panelWidth - 100, useAdvancedWrap: true },
        lineSpacing: 8,
      })
      .setOrigin(...LayoutConfig.ALIGN.TOP_CENTER);

    this.continuePrompt = scene.add
      .text(0, 0, "", {
        fontFamily: LayoutConfig.FONTS.BODY,
        fontSize: LayoutConfig.FONTS.SIZES.METADATA,
        color: LayoutConfig.COLORS.SUCCESS_GREEN || "#00ff00",
        fontStyle: LayoutConfig.FONTS.STYLES.BOLD,
      })
      .setOrigin(...LayoutConfig.ALIGN.BOTTOM_RIGHT);

    // Hint Padronizado
    this.escHint = this.createKeyHint("");
    this.escHint.setOrigin(0, 1);

    this.nextIndicator = scene.add
      .text(0, 0, "▼", {
        fontFamily: LayoutConfig.FONTS.BODY,
        fontSize: LayoutConfig.FONTS.SIZES.METADATA,
        color: LayoutConfig.COLORS.SUCCESS_GREEN || "#00ff00",
      })
      .setOrigin(...LayoutConfig.ALIGN.CENTER);

    const yesText = this.scene.add
      .text(0, 0, "Sim", {
        fontFamily: LayoutConfig.FONTS.TITLE,
        fontSize: LayoutConfig.FONTS.SIZES.TITLE,
        color: LayoutConfig.COLORS.GOLD,
      })
      .setOrigin(...LayoutConfig.ALIGN.CENTER)
      .setVisible(false);
    const noText = this.scene.add
      .text(0, 0, "Não", {
        fontFamily: LayoutConfig.FONTS.TITLE,
        fontSize: LayoutConfig.FONTS.SIZES.TITLE,
        color: LayoutConfig.COLORS.WHITE,
      })
      .setOrigin(...LayoutConfig.ALIGN.CENTER)
      .setVisible(false);
    this.confirmOptionTexts = [yesText, noText];

    this.add([
      this.bg,
      this.contentText,
      this.continuePrompt,
      this.escHint,
      this.nextIndicator,
      ...this.confirmOptionTexts,
    ]);

    // Native input
    for (const key of ["W", "UP", "A", "LEFT"]) {
      this.bindKey(key, () => this.moveConfirmSelection(-1));
    }
    for (const key of ["S", "DOWN", "D", "RIGHT"]) {
      this.bindKey(key, () => this.moveConfirmSelection(1));
    }
    // E advances/confirms dialogue. ESC cancels confirmation, doesn't skip dialogue.
    this.bindKey("E", () => this.confirmSelection());
    this.bindKey("ESC", () => {
      if (this.mode === "confirmation") return this.confirmSelection(false);

      return;
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
    this.mode = "dialogue";
    this.lines = lines;
    this.currentLineIndex = 0;
    this.onComplete = onComplete || null;

    // Prevent the same keydown that opened the dialogue from immediately
    // advancing to the next line. Ignore the next confirm input briefly.
    this.ignoreNextConfirm = true;
    this.scene.time.delayedCall(60, () => {
      this.ignoreNextConfirm = false;
    });

    this.updateContent();
    this.show();
  }

  public showConfirmation(
    message: string,
    onYes: () => void,
    onNo: () => void,
  ) {
    this.mode = "confirmation";
    this.confirmMessage = message;
    this.confirmSelectedIndex = 0;
    this.onConfirmYes = onYes;
    this.onConfirmNo = onNo;

    this.lines = [];
    this.currentLineIndex = 0;
    this.onComplete = null;

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

    this.applyScaledFontSize(
      this.contentText,
      LayoutConfig.FONTS.SIZES.BODY,
      w,
      h,
    );
    this.applyScaledFontSize(
      this.continuePrompt,
      LayoutConfig.FONTS.SIZES.METADATA,
      w,
      h,
    );
    this.applyScaledFontSize(
      this.escHint,
      LayoutConfig.FONTS.SIZES.METADATA,
      w,
      h,
    );
    this.applyScaledFontSize(
      this.nextIndicator,
      LayoutConfig.FONTS.SIZES.METADATA,
      w,
      h,
    );
    this.applyScaledFontSize(
      this.confirmOptionTexts[0],
      LayoutConfig.FONTS.SIZES.TITLE,
      w,
      h,
    );
    this.applyScaledFontSize(
      this.confirmOptionTexts[1],
      LayoutConfig.FONTS.SIZES.TITLE,
      w,
      h,
    );
  }

  private updateContent() {
    if (this.mode === "confirmation") {
      this.contentText.setText(this.confirmMessage);

      this.continuePrompt.setText("Aperte E para confirmar");
      this.continuePrompt.setVisible(true);
      this.nextIndicator.setVisible(false);

      this.escHint.setText("Aperte ESC para cancelar");
      this.escHint.setFontFamily(LayoutConfig.FONTS.BODY);

      this.confirmOptionTexts[0].setVisible(true);
      this.confirmOptionTexts[1].setVisible(true);
      this.updateConfirmOptionStyles();

      this.updateDialogDimensions();
      return;
    }

    const line = this.lines[this.currentLineIndex];
    this.contentText.setText(line);

    const isLastLine = this.currentLineIndex === this.lines.length - 1;
    this.continuePrompt.setText(
      isLastLine ? "Aperte E para fechar" : "Aperte E para continuar",
    );
    this.continuePrompt.setVisible(true);
    this.escHint.setText("");
    this.nextIndicator.setVisible(!isLastLine);

    this.confirmOptionTexts[0].setVisible(false);
    this.confirmOptionTexts[1].setVisible(false);

    this.updateDialogDimensions();
  }

  private updateDialogDimensions() {
    const textPadding = 40;
    const controlsPadding = 60;
    const textHeight = this.contentText.displayHeight;

    const confirmOptionsHeight =
      this.mode === "confirmation"
        ? Math.max(
            this.confirmOptionTexts[0].displayHeight,
            this.confirmOptionTexts[1].displayHeight,
          ) + 30
        : 0;

    const targetHeight = Math.max(
      this.minPanelHeight,
      textHeight + textPadding + controlsPadding + confirmOptionsHeight,
    );
    this.bg.setSize(this.panelWidth, targetHeight);

    this.contentText.setPosition(0, textPadding);

    const bw = this.panelWidth;
    const bh = targetHeight;
    this.continuePrompt.setPosition(bw / 2 - 30, bh - 20);
    this.escHint.setPosition(-bw / 2 + 30, bh - 20);
    this.nextIndicator.setPosition(bw / 2 - 30, bh - 50);

    if (this.mode === "confirmation") {
      const startY = textPadding + textHeight + 30;
      const spacing = 220;
      this.confirmOptionTexts[0].setPosition(-spacing / 2, startY);
      this.confirmOptionTexts[1].setPosition(spacing / 2, startY);
    }
  }

  private nextLine() {
    if (!this._isVisible) return;
    if (this.mode === "confirmation") return;
    this.currentLineIndex++;
    if (this.currentLineIndex >= this.lines.length) {
      this.hide();
    } else {
      this.updateContent();
    }
  }

  private moveConfirmSelection(dir: number) {
    if (!this._isVisible) return;
    if (this.mode !== "confirmation") return;

    this.confirmSelectedIndex = Phaser.Math.Wrap(
      this.confirmSelectedIndex + dir,
      0,
      this.confirmOptionTexts.length,
    );
    this.updateConfirmOptionStyles();
  }

  private updateConfirmOptionStyles() {
    this.confirmOptionTexts.forEach((text, idx) => {
      text.setColor(
        idx === this.confirmSelectedIndex
          ? LayoutConfig.COLORS.GOLD
          : LayoutConfig.COLORS.WHITE,
      );
      text.setScale(idx === this.confirmSelectedIndex ? 1.1 : 1);
    });
  }

  private confirmSelection(forceYes?: boolean) {
    if (!this._isVisible) return;
    if (this.mode !== "confirmation") {
      if (this.ignoreNextConfirm) {
        this.ignoreNextConfirm = false;
        return;
      }
      return this.nextLine();
    }

    const yes = forceYes ?? this.confirmSelectedIndex === 0;
    const cb = yes ? this.onConfirmYes : this.onConfirmNo;

    this.onConfirmYes = null;
    this.onConfirmNo = null;
    this.mode = "dialogue";

    this.hide(200, () => cb?.());
  }
}
