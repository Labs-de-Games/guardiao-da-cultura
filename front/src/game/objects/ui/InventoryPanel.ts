import type * as Phaser from "phaser";
import { LayoutConfig } from "../../constants/LayoutConfig";
import type { MissionDef } from "../../types/GameDataTypes";
import { type QuestManager, QuestStatus } from "../QuestManager";
import { BasePanel } from "./BasePanel";

/**
 * Componente que gerencia a exibição do "Mapa das Relíquias" (Inventário).
 * Isola a lógica de renderização da grade e estados das missões.
 */
export class InventoryPanel extends BasePanel {
  private dimmer: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Container;
  private bgGraphics: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private content: Phaser.GameObjects.Container;

  private panelW: number = LayoutConfig.UI.INVENTORY.MAX_WIDTH;
  private panelH: number = LayoutConfig.UI.INVENTORY.MAX_HEIGHT;

  private readonly relicTextureByInfoKey: Record<string, string> = {
    statue_info: "relic_statue",
    painting_info: "relic_painting",
    sarcophagus_info: "relic_sarcophagus",
    fossil_info: "relic_fossil",
  };

  constructor(
    scene: Phaser.Scene,
    private questManager: QuestManager,
    private missionDefs: Record<string, MissionDef>,
  ) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.INVENTORY);

    // Fundo escurecido (Dimmer)
    this.dimmer = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.55);
    this.dimmer.setOrigin(0.5);
    this.dimmer.setInteractive();

    // Container do painel central
    this.panel = scene.add.container(0, 0);
    this.bgGraphics = scene.add.graphics();

    this.title = scene.add
      .text(0, 0, "Mapa das Relíquias", {
        fontSize: "42px",
        color: LayoutConfig.COLORS.PRIMARY_BROWN,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);

    this.hint = scene.add
      .text(0, 0, "[TAB] para fechar", {
        fontSize: "22px",
        color: LayoutConfig.COLORS.SECONDARY_BROWN,
      })
      .setOrigin(0.5, 0);

    this.content = scene.add.container(0, 0);

    this.panel.add([this.bgGraphics, this.title, this.hint, this.content]);
    this.add([this.dimmer, this.panel]);
  }

  public layout(w: number, h: number) {
    this.dimmer.setPosition(w / 2, h / 2);
    this.dimmer.setSize(w, h);

    this.panelW = Math.min(
      Math.floor(w * 0.9),
      LayoutConfig.UI.INVENTORY.MAX_WIDTH,
    );
    this.panelH = Math.min(
      Math.floor(h * 0.9),
      LayoutConfig.UI.INVENTORY.MAX_HEIGHT,
    );

    this.panel.setPosition(w / 2, h / 2);

    this.redrawBg();

    const topY = -this.panelH / 2;
    this.title.setPosition(0, topY + 18);
    this.hint.setPosition(0, topY + 66);

    const padding = LayoutConfig.UI.INVENTORY.PADDING;
    const contentX = -this.panelW / 2 + padding;
    const contentY = topY + 110;
    this.content.setPosition(contentX, contentY);

    if (this._isVisible) {
      this.refresh();
    }
  }

  private redrawBg() {
    const w = this.panelW;
    const h = this.panelH;
    const x = -w / 2;
    const y = -h / 2;

    this.bgGraphics.clear();
    this.bgGraphics.fillStyle(LayoutConfig.COLORS.INVENTORY_BG, 1);
    this.bgGraphics.fillRoundedRect(x, y, w, h, 18);

    this.bgGraphics.fillStyle(LayoutConfig.COLORS.INVENTORY_INNER, 0.35);
    this.bgGraphics.fillRoundedRect(x + 10, y + 10, w - 20, h - 20, 14);

    this.bgGraphics.lineStyle(6, LayoutConfig.COLORS.BORDER_BROWN, 0.85);
    this.bgGraphics.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 18);

    this.bgGraphics.lineStyle(2, 0x000000, 0.12);
    this.bgGraphics.strokeRoundedRect(x + 14, y + 14, w - 28, h - 28, 14);
  }

  public refresh() {
    this.content.removeAll(true);
    const padding = LayoutConfig.UI.INVENTORY.PADDING;
    const contentW = this.panelW - padding * 2;
    const slot = LayoutConfig.UI.INVENTORY.SLOT_SIZE;
    const gap = LayoutConfig.UI.INVENTORY.SLOT_GAP;
    const cols = Math.max(1, Math.floor((contentW + gap) / (slot + gap)));

    let y = 0;
    let sections = 0;

    for (const missionId in this.missionDefs) {
      const mission = this.missionDefs[missionId];
      const status = this.questManager.getStatus(mission.id);
      if (status !== QuestStatus.COMPLETED) continue;

      sections++;
      const header = this.scene.add
        .text(0, y, mission.title, {
          fontSize: "28px",
          color: "#3b2a1a",
          fontStyle: "bold",
        })
        .setOrigin(0, 0);
      this.content.add(header);
      y += header.displayHeight + 14;

      mission.steps.forEach((step, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = col * (slot + gap);
        const sy = y + row * (slot + gap);

        const slotBg = this.scene.add.rectangle(
          x + slot / 2,
          sy + slot / 2,
          slot,
          slot,
          0x000000,
          0.07,
        );
        slotBg.setStrokeStyle(4, LayoutConfig.COLORS.BORDER_BROWN, 0.78);

        const inner = this.scene.add.rectangle(
          x + slot / 2,
          sy + slot / 2,
          slot - 14,
          slot - 14,
          0xffffff,
          0.16,
        );
        inner.setStrokeStyle(2, 0x000000, 0.1);

        const textureKey = this.relicTextureByInfoKey[step.infoKey];
        if (textureKey && this.scene.textures.exists(textureKey)) {
          const img = this.scene.add
            .image(x + slot / 2, sy + slot / 2, textureKey)
            .setOrigin(0.5);
          const scale = Math.min(
            (slot - 18) / img.width,
            (slot - 18) / img.height,
          );
          img.setScale(scale);
          this.content.add([slotBg, inner, img]);
        } else {
          const label = this.scene.add
            .text(
              x + slot / 2,
              sy + slot / 2,
              this.getPlaceholderLabel(step.infoKey),
              {
                fontSize: "18px",
                color: "#3b2a1a",
                fontStyle: "bold",
              },
            )
            .setOrigin(0.5);
          this.content.add([slotBg, inner, label]);
        }
      });

      const rows = Math.ceil(mission.steps.length / cols);
      y += rows * (slot + gap) + 22;
    }

    if (sections === 0) {
      const empty = this.scene.add
        .text(
          contentW / 2,
          140,
          "Complete uma missão para revelar relíquias no mapa.",
          {
            fontSize: "26px",
            color: "#4b3a2a",
            wordWrap: { width: Math.min(900, contentW), useAdvancedWrap: true },
            align: "center",
          },
        )
        .setOrigin(0.5);
      this.content.add(empty);
    }
  }

  private getPlaceholderLabel(infoKey: string): string {
    const parts = infoKey.split("_").filter(Boolean);
    if (parts.length === 0) return "??";
    const a = parts[0]?.slice(0, 2) || "";
    const b = parts[1]?.slice(0, 1) || "";
    return `${a}${b}`.toUpperCase() || "??";
  }

  public override show() {
    if (this._isVisible) return;
    this._isVisible = true;
    this.refresh();
    this.setVisible(true);
    this.panel.setScale(0.98);

    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 140,
      ease: "Quad.Out",
    });
    this.scene.tweens.add({
      targets: this.panel,
      scale: 1,
      duration: 180,
      ease: "Quad.Out",
    });
  }

  public toggle() {
    if (this._isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}
