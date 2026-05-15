import * as Phaser from "phaser";
import { GameEvents } from "../../constants/GameEvents";
import { Actions } from "../../constants/KeyBindings";
import { LayoutConfig } from "../../constants/LayoutConfig";
import { SceneNames } from "../../constants/SceneNames";
import { onKeyDown } from "../../systems/InputManager";
import {
  computeLockedSlots,
  ensureValidGridIndex,
  hasAnyFreeGridSlot,
  initChunkNavState,
  normalizeFilledSlots,
  reduceChunkNavOnArrow,
} from "./chunkSelectorNavigation";

export class ChunkSelector extends Phaser.GameObjects.Container {
  private bg!: Phaser.GameObjects.Rectangle;
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
  public isVisible: boolean = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    this.createBackground();
    this.createTitle();
    this.inventoryContainer = scene.add.container(-340, -200);
    this.gridContainer = scene.add.container(80, -80);
    this.add([this.inventoryContainer, this.gridContainer]);

    this.createConfirmButton();

    this.setDepth(LayoutConfig.UI.DEPTHS.INVENTORY);
    this.setScrollFactor(0);
    this.setVisible(false);
    scene.add.existing(this);

    this.setupKeyboardListeners();
  }

  private createBackground() {
    this.bg = this.scene.add.rectangle(0, 0, 1000, 750, 0x000000, 0.9);
    this.bg.setStrokeStyle(4, LayoutConfig.COLORS.GOLD_HEX);
    this.add(this.bg);
  }

  private createTitle() {
    this.title = this.scene.add
      .text(0, -320, "RESTAURAÇÃO DE OBRA", {
        fontSize: "32px",
        color: LayoutConfig.COLORS.GOLD,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const subtitle = this.scene.add
      .text(0, -280, "Use os pedaços para montar a fotografia", {
        fontSize: "18px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5);

    this.add([this.title, subtitle]);
  }

  private createConfirmButton() {
    this.confirmButton = this.scene.add.container(0, 300);
    const btnBg = this.scene.add
      .rectangle(0, 0, 200, 50, 0x333333)
      .setStrokeStyle(2, 0xffffff);
    const btnText = this.scene.add
      .text(0, 0, "CONFIRMAR", { fontSize: "20px", color: "#ffffff" })
      .setOrigin(0.5);
    this.confirmButton.add([btnBg, btnText]);
    this.add(this.confirmButton);
  }

  public show(
    instanceId: string,
    items: { id: string; name: string }[],
    filledSlots: (string | null)[] = [],
  ) {
    this.currentInstanceId = instanceId;
    this.availableItems = items;

    this.slots = normalizeFilledSlots(filledSlots);
    this.lockedSlots = computeLockedSlots(this.slots);

    this.pickedItemIndex = null;
    this.usedInventoryIndices = [null, null, null, null];

    const navInit = initChunkNavState({
      inventoryCount: this.availableItems.length,
      lockedSlots: this.lockedSlots,
    });
    this.cursorMode = navInit.cursorMode;
    this.selectedInventoryIndex = navInit.selectedInventoryIndex;
    this.selectedGridIndex = navInit.selectedGridIndex;

    this.isVisible = true;
    this.setVisible(true);
    this.refreshUI();
    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.DIALOGUE_STARTED);
  }

  public hide() {
    this.isVisible = false;
    this.setVisible(false);
    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.DIALOGUE_ENDED);
  }

  private refreshUI() {
    this.refreshInventory();
    this.refreshGrid();
    this.refreshConfirmButton();
  }

  private refreshInventory() {
    this.inventoryContainer.removeAll(true);

    // Match same aspect ratio as grid (chunk native: 122x80)
    const slotW = 220;
    const slotH = 145;
    const gap = 10;
    const itemSpacing = slotH + gap;
    const scale = slotW / 122;

    const title = this.scene.add
      .text(0, -slotH / 2 - 30, "INVENTÁRIO", {
        fontSize: "18px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5);
    this.inventoryContainer.add(title);

    if (this.availableItems.length === 0) {
      const empty = this.scene.add
        .text(0, 0, "(sem itens)", { fontSize: "16px", color: "#777777" })
        .setOrigin(0.5);
      this.inventoryContainer.add(empty);
      return;
    }

    this.availableItems.forEach((item, index) => {
      const isSelected =
        this.cursorMode === "inventory" &&
        this.selectedInventoryIndex === index;
      const isPicked = this.pickedItemIndex === index;
      const isAlreadyUsed = this.usedInventoryIndices.includes(index);

      const bgColor = isSelected
        ? 0x665500
        : isPicked
          ? 0x444444
          : isAlreadyUsed
            ? 0x111111
            : 0x222222;

      const y = index * itemSpacing;

      const box = this.scene.add
        .rectangle(0, y, slotW, slotH, bgColor)
        .setStrokeStyle(
          2,
          isSelected ? 0xffd700 : isAlreadyUsed ? 0x333333 : 0x555555,
        );

      const img = this.scene.add.image(0, y, item.id).setScale(scale);
      if (isAlreadyUsed && !isSelected) {
        img.setAlpha(0.3);
      }

      this.inventoryContainer.add([box, img]);
    });
  }

  private refreshGrid() {
    this.gridContainer.removeAll(true);

    const slotW = 220;
    const slotH = 145;
    const gapX = 1;
    const gapY = 1;

    const totalW = slotW * 2 + gapX;
    const centerX = totalW / 2 - slotW / 2;

    const title = this.scene.add
      .text(centerX, -100, "MOLDURA", { fontSize: "18px", color: "#aaaaaa" })
      .setOrigin(0.5);
    this.gridContainer.add(title);

    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const isSelected =
        this.cursorMode === "grid" && this.selectedGridIndex === i;
      const isLocked = this.lockedSlots[i];

      const x = col * (slotW + gapX);
      const y = row * (slotH + gapY);

      if (!isLocked) {
        const box = this.scene.add.rectangle(x, y, slotW, slotH, 0x111111);
        if (isSelected) {
          box.setStrokeStyle(3, 0xffd700);
        } else {
          box.setStrokeStyle(3, 0x444444);
        }
        this.gridContainer.add(box);
      }

      const itemId = this.slots[i];

      if (itemId) {
        // Scale image to fill slotW preserving aspect ratio (122x80 native)
        const scale = slotW / 122;
        const img = this.scene.add.image(x, y, itemId).setScale(scale);
        if (isLocked) {
          img.setTint(0x88ff88);
        }
        this.gridContainer.add(img);
      }
    }
  }

  private refreshConfirmButton() {
    const bg = this.confirmButton.getAt(0) as Phaser.GameObjects.Rectangle;
    const isSelected = this.cursorMode === "confirm";
    bg.setFillStyle(isSelected ? 0xffd700 : 0x333333);
    const txt = this.confirmButton.getAt(1) as Phaser.GameObjects.Text;
    txt.setColor(isSelected ? "#000000" : "#ffffff");
  }

  private setupKeyboardListeners() {
    onKeyDown(this.scene, Actions.NAV_UP, () => {
      if (!this.isVisible) return;
      this.moveCursor("up");
      this.refreshUI();
    });
    onKeyDown(this.scene, Actions.NAV_DOWN, () => {
      if (!this.isVisible) return;
      this.moveCursor("down");
      this.refreshUI();
    });
    onKeyDown(this.scene, Actions.NAV_LEFT, () => {
      if (!this.isVisible) return;
      this.moveCursor("left");
      this.refreshUI();
    });
    onKeyDown(this.scene, Actions.NAV_RIGHT, () => {
      if (!this.isVisible) return;
      this.moveCursor("right");
      this.refreshUI();
    });
    onKeyDown(this.scene, Actions.CONFIRM, () => {
      if (!this.isVisible) return;
      this.handleAction();
      this.refreshUI();
    });
    onKeyDown(this.scene, Actions.CLOSE, () => {
      if (!this.isVisible) return;
      this.hide();
    });
  }

  private moveCursor(dir: string) {
    if (dir !== "up" && dir !== "down" && dir !== "left" && dir !== "right") {
      return;
    }

    const next = reduceChunkNavOnArrow(
      {
        cursorMode: this.cursorMode,
        selectedInventoryIndex: this.selectedInventoryIndex,
        selectedGridIndex: this.selectedGridIndex,
      },
      {
        inventoryCount: this.availableItems.length,
        lockedSlots: this.lockedSlots,
      },
      dir,
    );

    this.cursorMode = next.cursorMode;
    this.selectedInventoryIndex = next.selectedInventoryIndex;
    this.selectedGridIndex = next.selectedGridIndex;
  }

  private handleAction() {
    if (this.cursorMode === "inventory") {
      if (this.availableItems.length <= 0) return;
      if (!hasAnyFreeGridSlot(this.lockedSlots)) {
        // No selectable cells; user must be able to finish via confirm.
        this.cursorMode = "confirm";
        this.pickedItemIndex = null;
        return;
      }

      const isAlreadyUsed = this.usedInventoryIndices.includes(
        this.selectedInventoryIndex,
      );
      if (isAlreadyUsed) return;

      this.pickedItemIndex = this.selectedInventoryIndex;
      this.cursorMode = "grid";
      this.selectedGridIndex = ensureValidGridIndex(
        this.selectedGridIndex,
        this.lockedSlots,
      );
    } else if (this.cursorMode === "grid") {
      this.selectedGridIndex = ensureValidGridIndex(
        this.selectedGridIndex,
        this.lockedSlots,
      );
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
  }
}
