import type * as Phaser from "phaser";
import { GameEvents } from "../../constants/GameEvents";
import { LayoutConfig } from "../../constants/LayoutConfig";
import { SceneNames } from "../../constants/SceneNames";
import { BasePanel } from "./BasePanel";

export class ChunkSelector extends BasePanel {
  private title!: Phaser.GameObjects.Text;

  private inventoryContainer!: Phaser.GameObjects.Container;
  private gridContainer!: Phaser.GameObjects.Container;
  private confirmButton!: Phaser.GameObjects.Container;

  private availableItems: { id: string; name: string }[] = [];
  private slots: (string | null)[] = [null, null, null, null];

  private cursorMode: "inventory" | "grid" | "confirm" = "inventory";
  private selectedInventoryIndex: number = 0;
  private selectedGridIndex: number = 0;
  private pickedItemIndex: number | null = null;
  private usedInventoryIndices: (number | null)[] = [null, null, null, null];
  private lockedSlots: boolean[] = [false, false, false, false];

  private currentInstanceId: string = "";

  private readonly panelWidth = 750;
  private readonly panelHeight = 500;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    this.bg = this.createStandardBg(this.panelWidth, this.panelHeight);
    this.bg.setOrigin(...LayoutConfig.ALIGN.CENTER);
    this.add(this.bg);

    this.title = this.scene.add
      .text(0, -this.panelHeight / 2 + 40, "RESTAURAÇÃO DE OBRA", {
        fontFamily: LayoutConfig.FONTS.TITLE,
        fontSize: LayoutConfig.FONTS.SIZES.TITLE,
        color: LayoutConfig.COLORS.GOLD,
        fontStyle: LayoutConfig.FONTS.STYLES.BOLD,
      })
      .setOrigin(...LayoutConfig.ALIGN.CENTER);
    this.add(this.title);

    this.inventoryContainer = scene.add.container(-250, -50);
    this.gridContainer = scene.add.container(100, -50);
    this.add([this.inventoryContainer, this.gridContainer]);

    this.createConfirmButton();

    this.setDepth(LayoutConfig.UI.DEPTHS.INVENTORY);
    this.setScrollFactor(0);

    this.bindKey("UP", () => {
      if (!this._isVisible) return;
      this.moveCursor("up");
      this.refreshUI();
    });
    this.bindKey("DOWN", () => {
      if (!this._isVisible) return;
      this.moveCursor("down");
      this.refreshUI();
    });
    this.bindKey("LEFT", () => {
      if (!this._isVisible) return;
      this.moveCursor("left");
      this.refreshUI();
    });
    this.bindKey("RIGHT", () => {
      if (!this._isVisible) return;
      this.moveCursor("right");
      this.refreshUI();
    });
    this.bindKey("SPACE", () => {
      if (!this._isVisible) return;
      this.handleAction();
      this.refreshUI();
    });
    this.bindKey("ENTER", () => {
      if (!this._isVisible) return;
      this.handleAction();
      this.refreshUI();
    });
    this.bindKey("ESC", () => {
      if (!this._isVisible) return;
      this.hide();
    });
  }

  private createConfirmButton() {
    this.confirmButton = this.scene.add.container(0, 200);
    const btnBg = this.scene.add
      .rectangle(0, 0, 200, 50, LayoutConfig.COLORS.CHUNK_CONFIRM_BG)
      .setStrokeStyle(2, LayoutConfig.COLORS.WHITE_HEX);
    const btnText = this.scene.add
      .text(0, 0, "CONFIRMAR", {
        fontFamily: LayoutConfig.FONTS.BODY,
        fontSize: LayoutConfig.FONTS.SIZES.METADATA,
        color: LayoutConfig.COLORS.WHITE,
      })
      .setOrigin(...LayoutConfig.ALIGN.CENTER);
    this.confirmButton.add([btnBg, btnText]);
    this.add(this.confirmButton);
  }

  public showChunk(
    instanceId: string,
    items: { id: string; name: string }[],
    filledSlots: (string | null)[] = [],
  ) {
    this.currentInstanceId = instanceId;
    this.availableItems = items;
    this.slots = [...filledSlots];
    this.lockedSlots = filledSlots.map((s) => s !== null);
    this.pickedItemIndex = null;
    this.usedInventoryIndices = [null, null, null, null];
    this.cursorMode = "inventory";
    this.selectedInventoryIndex = 0;

    const firstFree = this.lockedSlots.findIndex((l) => !l);
    this.selectedGridIndex = firstFree !== -1 ? firstFree : 0;

    this.refreshUI();
    super.show();

    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.DIALOGUE_STARTED);
  }

  public override hide(duration: number = 120, onComplete?: () => void) {
    if (!this._isVisible) return;

    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.DIALOGUE_ENDED);

    super.hide(duration, onComplete);
  }

  private refreshUI() {
    this.refreshInventory();
    this.refreshGrid();
    this.refreshConfirmButton();
  }

  private refreshInventory() {
    this.inventoryContainer.removeAll(true);
    const title = this.scene.add
      .text(0, -100, "INVENTÁRIO", {
        fontFamily: LayoutConfig.FONTS.BODY,
        fontSize: LayoutConfig.FONTS.SIZES.HINT,
        color: LayoutConfig.COLORS.DISABLED_GREY,
      })
      .setOrigin(...LayoutConfig.ALIGN.CENTER);
    this.inventoryContainer.add(title);

    this.availableItems.forEach((item, index) => {
      const isSelected =
        this.cursorMode === "inventory" &&
        this.selectedInventoryIndex === index;
      const isPicked = this.pickedItemIndex === index;
      const isAlreadyUsed = this.usedInventoryIndices.includes(index);

      const bgColor = isSelected
        ? LayoutConfig.COLORS.CHUNK_SELECTED
        : isPicked
          ? LayoutConfig.COLORS.CHUNK_HOLDING
          : isAlreadyUsed
            ? LayoutConfig.COLORS.CHUNK_USED
            : LayoutConfig.COLORS.CHUNK_DEFAULT;

      const box = this.scene.add
        .rectangle(0, index * 60, 220, 50, bgColor)
        .setStrokeStyle(
          2,
          isSelected
            ? LayoutConfig.COLORS.GOLD_HEX
            : isAlreadyUsed
              ? LayoutConfig.COLORS.CHUNK_STROKE_USED
              : LayoutConfig.COLORS.CHUNK_STROKE_DEFAULT,
        );

      const img = this.scene.add.image(0, index * 60, item.id).setScale(0.3);
      if (isAlreadyUsed && !isSelected) {
        img.setAlpha(0.3);
      }

      this.inventoryContainer.add([box, img]);
    });
  }

  private refreshGrid() {
    this.gridContainer.removeAll(true);
    const title = this.scene.add
      .text(80, -100, "MOLDURA", {
        fontFamily: LayoutConfig.FONTS.BODY,
        fontSize: LayoutConfig.FONTS.SIZES.HINT,
        color: LayoutConfig.COLORS.DISABLED_GREY,
      })
      .setOrigin(...LayoutConfig.ALIGN.CENTER);
    this.gridContainer.add(title);

    const slotSize = 120;
    const gap = 10;

    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const isSelected =
        this.cursorMode === "grid" && this.selectedGridIndex === i;
      const isLocked = this.lockedSlots[i];

      const x = col * (slotSize + gap);
      const y = row * (slotSize + gap);

      if (!isLocked) {
        const box = this.scene.add.rectangle(
          x,
          y,
          slotSize,
          slotSize,
          LayoutConfig.COLORS.CHUNK_BG,
        );
        if (isSelected) {
          box.setStrokeStyle(3, LayoutConfig.COLORS.GOLD_HEX);
        } else {
          box.setStrokeStyle(3, LayoutConfig.COLORS.CHUNK_STROKE_EMPTY);
        }
        this.gridContainer.add(box);
      }

      const itemId = this.slots[i];

      if (itemId) {
        const img = this.scene.add.image(x, y, itemId).setScale(0.8);
        if (isLocked) {
          img.setTint(LayoutConfig.COLORS.LOCK_TINT);
        }
        this.gridContainer.add(img);
      }
    }
  }

  private refreshConfirmButton() {
    const bg = this.confirmButton.getAt(0) as Phaser.GameObjects.Rectangle;
    const isSelected = this.cursorMode === "confirm";
    bg.setFillStyle(
      isSelected
        ? LayoutConfig.COLORS.GOLD_HEX
        : LayoutConfig.COLORS.CHUNK_CONFIRM_BG,
    );
    const txt = this.confirmButton.getAt(1) as Phaser.GameObjects.Text;
    txt.setColor(
      isSelected ? LayoutConfig.COLORS.BLACK : LayoutConfig.COLORS.WHITE,
    );
  }

  private moveCursor(dir: string) {
    if (this.cursorMode === "inventory") {
      this.moveInventoryCursor(dir);
    } else if (this.cursorMode === "grid") {
      this.moveGridCursor(dir);
    } else if (this.cursorMode === "confirm") {
      this.moveConfirmCursor(dir);
    }
  }

  private moveInventoryCursor(dir: string) {
    if (dir === "down")
      this.selectedInventoryIndex =
        (this.selectedInventoryIndex + 1) % this.availableItems.length;
    if (dir === "up")
      this.selectedInventoryIndex =
        (this.selectedInventoryIndex - 1 + this.availableItems.length) %
        this.availableItems.length;
    if (dir === "right") this.cursorMode = "grid";
  }

  private moveGridCursor(dir: string) {
    let nextIndex = this.selectedGridIndex;

    if (dir === "left") {
      if (nextIndex % 2 === 1) nextIndex--;
      else {
        this.cursorMode = "inventory";
        return;
      }
    } else if (dir === "right") {
      if (nextIndex % 2 === 0) nextIndex++;
    } else if (dir === "down") {
      if (nextIndex < 2) nextIndex += 2;
      else {
        this.cursorMode = "confirm";
        return;
      }
    } else if (dir === "up") {
      if (nextIndex >= 2) nextIndex -= 2;
      else {
        this.cursorMode = "inventory";
        return;
      }
    }

    if (this.lockedSlots[nextIndex]) {
      if (dir === "up" || dir === "down") {
        const otherInRow = nextIndex % 2 === 0 ? nextIndex + 1 : nextIndex - 1;
        if (!this.lockedSlots[otherInRow]) nextIndex = otherInRow;
      } else {
        const otherInCol = nextIndex < 2 ? nextIndex + 2 : nextIndex - 2;
        if (!this.lockedSlots[otherInCol]) nextIndex = otherInCol;
      }
    }

    if (!this.lockedSlots[nextIndex]) {
      this.selectedGridIndex = nextIndex;
    }
  }

  private moveConfirmCursor(dir: string) {
    if (dir === "up") this.cursorMode = "grid";
  }

  private handleAction() {
    if (this.cursorMode === "inventory") {
      const isAlreadyUsed = this.usedInventoryIndices.includes(
        this.selectedInventoryIndex,
      );
      if (isAlreadyUsed) return;

      this.pickedItemIndex = this.selectedInventoryIndex;
      this.cursorMode = "grid";
    } else if (this.cursorMode === "grid") {
      const isLocked = this.lockedSlots[this.selectedGridIndex];
      if (isLocked) return;

      if (this.pickedItemIndex !== null) {
        const item = this.availableItems[this.pickedItemIndex];
        this.slots[this.selectedGridIndex] = item.id;
        this.usedInventoryIndices[this.selectedGridIndex] =
          this.pickedItemIndex;
        this.pickedItemIndex = null;
        this.cursorMode = "inventory";
      } else {
        this.slots[this.selectedGridIndex] = null;
        this.usedInventoryIndices[this.selectedGridIndex] = null;
      }
    } else if (this.cursorMode === "confirm") {
      this.confirmSelection();
    }
  }

  private confirmSelection() {
    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.INTERACTION_SUBMITTED, {
      instanceId: this.currentInstanceId,
      placedItems: this.slots,
    });
    this.hide();
  }

  public layout(w: number, h: number) {
    this.setPosition(w / 2, h / 2);

    this.applyScaledFontSize(this.title, LayoutConfig.FONTS.SIZES.TITLE, w, h);
  }
}
