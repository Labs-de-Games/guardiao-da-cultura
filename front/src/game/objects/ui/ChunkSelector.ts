import * as Phaser from "phaser";
import { GameEvents } from "../../constants/GameEvents";
import { LayoutConfig } from "../../constants/LayoutConfig";
import { SceneNames } from "../../constants/SceneNames";

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
    super(scene, scene.scale.width / 2, scene.scale.height / 2);

    this.createBackground();
    this.createTitle();

    this.inventoryContainer = scene.add.container(-250, -50);
    this.gridContainer = scene.add.container(100, -50);
    this.add([this.inventoryContainer, this.gridContainer]);

    this.createConfirmButton();

    this.setDepth(LayoutConfig.UI.DEPTHS.INVENTORY);
    this.setScrollFactor(0);
    this.setVisible(false);
    scene.add.existing(this);

    this.setupKeyboardListeners();
  }

  private createBackground() {
    this.bg = this.scene.add.rectangle(0, 0, 750, 500, 0x000000, 0.9);
    this.bg.setStrokeStyle(4, LayoutConfig.COLORS.GOLD_HEX);
    this.add(this.bg);
  }

  private createTitle() {
    this.title = this.scene.add
      .text(0, -210, "RESTAURAÇÃO DE OBRA", {
        fontSize: "32px",
        color: LayoutConfig.COLORS.GOLD,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add(this.title);
  }

  private createConfirmButton() {
    this.confirmButton = this.scene.add.container(0, 200);
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
    this.slots = [...filledSlots];
    this.lockedSlots = filledSlots.map((s) => s !== null);
    this.pickedItemIndex = null;
    this.usedInventoryIndices = [null, null, null, null];
    this.cursorMode = "inventory";
    this.selectedInventoryIndex = 0;

    const firstFree = this.lockedSlots.findIndex((l) => !l);
    this.selectedGridIndex = firstFree !== -1 ? firstFree : 0;

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
    const title = this.scene.add
      .text(0, -100, "INVENTÁRIO", { fontSize: "18px", color: "#aaaaaa" })
      .setOrigin(0.5);
    this.inventoryContainer.add(title);

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

      const box = this.scene.add
        .rectangle(0, index * 60, 220, 50, bgColor)
        .setStrokeStyle(
          2,
          isSelected ? 0xffd700 : isAlreadyUsed ? 0x333333 : 0x555555,
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
      .text(80, -100, "MOLDURA", { fontSize: "18px", color: "#aaaaaa" })
      .setOrigin(0.5);
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
          0x111111,
        );
        if (isSelected) {
          box.setStrokeStyle(3, 0xffd700);
        } else {
          box.setStrokeStyle(3, 0x444444);
        }
        this.gridContainer.add(box);
      }

      const itemId = this.slots[i];

      if (itemId) {
        const img = this.scene.add.image(x, y, itemId).setScale(0.8);
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
    this.scene.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (!this.isVisible) return;

      event.preventDefault();
      event.stopPropagation();

      switch (event.key) {
        case "ArrowUp":
          this.moveCursor("up");
          break;
        case "ArrowDown":
          this.moveCursor("down");
          break;
        case "ArrowLeft":
          this.moveCursor("left");
          break;
        case "ArrowRight":
          this.moveCursor("right");
          break;
        case "Enter":
        case " ":
          this.handleAction();
          break;
        case "Escape":
          this.hide();
          break;
      }
      this.refreshUI();
    });
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
  }
}
