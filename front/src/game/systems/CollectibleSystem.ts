import * as Phaser from "phaser";
import { LayoutConfig } from "../constants/LayoutConfig";
import { InteractiveButton } from "../objects/InteractiveButton";
import type { ScoreManager } from "../objects/ScoreManager";
import type {
  CollectibleData,
  CollectiblesJson,
  ContentJson,
} from "../types/GameDataTypes";
import { TiledUtils } from "../utils/TiledUtils";

export interface CollectibleInstance {
  collectibleId: string;
  collectibleType: keyof CollectiblesJson;
  collectibleData: CollectibleData;
  isCollected: boolean;
  sprite: Phaser.GameObjects.Sprite;
  button: InteractiveButton;
}

export class CollectibleSystem {
  private readonly scene: Phaser.Scene;
  private readonly scoreManager: ScoreManager;
  private readonly mapScale: number;
  private collectibles: CollectibleInstance[] = [];
  private inspectContainer: Phaser.GameObjects.Container | null = null;
  private inspectKeyHandler?: (event: KeyboardEvent) => void;
  private inspectOpenedAt: number = 0;

  constructor(
    scene: Phaser.Scene,
    scoreManager: ScoreManager,
    mapScale: number = LayoutConfig.GAME.MAP_SCALE,
  ) {
    this.scene = scene;
    this.scoreManager = scoreManager;
    this.mapScale = mapScale;
  }

  public registerAllFromLayer(
    layer: Phaser.Tilemaps.ObjectLayer,
    contentJson: ContentJson,
    player: Phaser.Physics.Arcade.Sprite,
  ): void {
    if (!layer?.objects?.length) return;

    layer.objects.forEach((obj) => {
      const collectibleId = TiledUtils.getProperty(obj, "collectible_id") as
        | string
        | undefined;
      const collectibleType = TiledUtils.getProperty(obj, "collectible_type") as
        | string
        | undefined;

      if (!collectibleId || !collectibleType) {
        console.warn(
          `[CollectibleSystem] Collectible "${obj.name}" is missing collectible_id or collectible_type`,
        );
        return;
      }

      const typeKey = collectibleType.toUpperCase() as keyof CollectiblesJson;
      const collectibleData =
        contentJson.collectibles[typeKey]?.[collectibleId];

      if (!collectibleData) {
        console.warn(
          `[CollectibleSystem] No data found for collectible id "${collectibleId}" in category "${typeKey}"`,
        );
        return;
      }

      this.registerCollectible(
        obj,
        collectibleData,
        typeKey,
        collectibleId,
        player,
      );
    });
  }

  public destroy() {
    this.hideInspectCard();

    if (this.inspectKeyHandler) {
      this.scene.input.keyboard?.off("keydown", this.inspectKeyHandler);
      this.inspectKeyHandler = undefined;
    }

    for (const collectible of this.collectibles) {
      collectible.button.destroy();
      collectible.sprite.destroy();
    }
    this.collectibles = [];
  }

  private registerCollectible(
    obj: Phaser.Types.Tilemaps.TiledObject,
    collectibleData: CollectibleData,
    collectibleType: keyof CollectiblesJson,
    collectibleId: string,
    player: Phaser.Physics.Arcade.Sprite,
  ) {
    const x = (obj.x ?? 0) * this.mapScale;
    const y = (obj.y ?? 0) * this.mapScale;
    const scale = collectibleData.assets.scaleOnMap ?? 2;

    const sprite = this.scene.add
      .sprite(x, y, collectibleData.assets.sprite)
      .setScale(scale)
      .setOrigin(0.5, 1)
      .setDepth(10);

    let instance: CollectibleInstance;

    const button = new InteractiveButton(this.scene, x, y, {
      dialogueLines: [],
      onInteract: () => {
        if (!instance.isCollected) {
          this.scoreManager.recordInteractible();
          instance.isCollected = true;
        }

        this.showInspectCard(instance.collectibleData, player);
      },
    });
    button.setPlayerTracking(player);

    instance = {
      collectibleId,
      collectibleType,
      collectibleData,
      isCollected: false,
      sprite,
      button,
    };

    this.collectibles.push(instance);
  }

  private showInspectCard(
    collectibleData: CollectibleData,
    player: Phaser.Physics.Arcade.Sprite,
  ) {
    this.hideInspectCard();

    const camera = this.scene.cameras.main;
    const viewportW = camera.width;
    const viewportH = camera.height;
    const cardSize = Math.floor(Math.min(viewportW, viewportH) * 0.34);
    const cardPos = this.getCardPosition(
      viewportW,
      viewportH,
      cardSize,
      player,
    );

    const container = this.scene.add
      .container(cardPos.x, cardPos.y)
      .setDepth(1000)
      .setScrollFactor(0)
      .setAngle(Phaser.Math.Between(-8, -3));

    // Procedural post-stamp look so color variants can be changed easily.
    const shadow = this.scene.add
      .rectangle(10, 10, cardSize, cardSize, 0x0f0f0f, 0.35)
      .setStrokeStyle(1, 0x000000, 0.2);

    const tone = Phaser.Math.Between(236, 250);
    const paperColor = Phaser.Display.Color.GetColor(tone, tone, tone);
    const paper = this.scene.add
      .rectangle(0, 0, cardSize, cardSize, paperColor, 1)
      .setStrokeStyle(3, 0xd8d8d8, 1);

    const innerFrame = this.scene.add
      .rectangle(0, 0, cardSize - 32, cardSize - 32, 0xffffff, 1)
      .setStrokeStyle(2, 0x1f1f1f, 0.8);

    const inspectScale = collectibleData.assets.scaleOnInspect ?? 6;
    const inspectSprite = this.scene.add
      .sprite(0, 0, collectibleData.assets.sprite)
      .setScale(inspectScale)
      .setOrigin(0.5, 0.5);

    container.add([shadow, paper, innerFrame, inspectSprite]);

    this.inspectContainer = container;
    this.inspectOpenedAt = this.scene.time.now;

    if (!this.inspectKeyHandler) {
      this.inspectKeyHandler = (event: KeyboardEvent) => {
        if (!this.inspectContainer) return;
        if (this.scene.time.now - this.inspectOpenedAt < 120) return;

        const isEscape = event.key.toLowerCase() === "escape";
        const isSpace =
          event.code === "Space" ||
          event.key === " " ||
          event.key === "Spacebar";

        if (isEscape || isSpace) {
          this.hideInspectCard();
        }
      };

      this.scene.input.keyboard?.on("keydown", this.inspectKeyHandler);
    }
  }

  private hideInspectCard() {
    if (!this.inspectContainer) return;
    this.inspectContainer.destroy(true);
    this.inspectContainer = null;
  }

  private getCardPosition(
    viewportW: number,
    viewportH: number,
    cardSize: number,
    player: Phaser.Physics.Arcade.Sprite,
  ): { x: number; y: number } {
    const camera = this.scene.cameras.main;
    const playerScreenX = player.x - camera.worldView.x;
    const playerScreenY = player.y - camera.worldView.y;

    const x = viewportW * 0.28;
    let y = viewportH * 0.5;

    const overlapX = Math.abs(playerScreenX - x) < cardSize * 0.55;
    const overlapY = Math.abs(playerScreenY - y) < cardSize * 0.55;

    if (overlapX && overlapY) {
      y = playerScreenY < viewportH * 0.5 ? viewportH * 0.74 : viewportH * 0.26;
    }

    const minY = cardSize * 0.55;
    const maxY = viewportH - cardSize * 0.55;

    return {
      x,
      y: Phaser.Math.Clamp(y, minY, maxY),
    };
  }
}
