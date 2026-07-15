import * as Phaser from "phaser";
import posthog from "posthog-js";
import { EventBus } from "../../shared/events/event-bus";
import { GameEvents } from "../constants/GameEvents";
import { LayoutConfig } from "../constants/LayoutConfig";
import { InteractiveButton } from "../objects/InteractiveButton";
import type { CollectibleData, ContentJson } from "../types/GameDataTypes";
import { TiledUtils } from "../utils/TiledUtils";

type CollectibleInspectMode = "idle" | "inspect";

export interface CollectibleInstance {
  collectibleId: string;
  collectibleType: "CLUE_VILLAIN";
  collectibleData: CollectibleData;
  isCollected: boolean;
  sprite: Phaser.GameObjects.Sprite;
  button: InteractiveButton;
}

export interface PersistedCollectible {
  collectibleId: string;
  collectibleType: "CLUE_VILLAIN";
}

export class CollectibleSystem {
  private readonly scene: Phaser.Scene;
  private readonly mapScale: number;
  private collectibles: CollectibleInstance[] = [];
  private activeCollectible: CollectibleInstance | null = null;
  private inspectMode: CollectibleInspectMode = "idle";
  private inspectContainer: Phaser.GameObjects.Container | null = null;
  private readonly dialogueEndedHandler = () => {
    this.closeInteraction(true);
  };

  constructor(
    scene: Phaser.Scene,
    mapScale: number = LayoutConfig.GAME.MAP_SCALE,
  ) {
    this.scene = scene;
    this.mapScale = mapScale;

    this.scene.events.on(GameEvents.DIALOGUE_ENDED, this.dialogueEndedHandler);
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

      const typeKey = collectibleType.toUpperCase() as "CLUE_VILLAIN";
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
        false,
      );
    });
  }

  public applyCollectedCollectibles(collected: PersistedCollectible[]): void {
    if (!collected.length) return;
    const collectedKey = new Set(
      collected.map((item) => `${item.collectibleType}:${item.collectibleId}`),
    );

    for (const collectible of this.collectibles) {
      if (
        collectedKey.has(
          `${collectible.collectibleType}:${collectible.collectibleId}`,
        )
      ) {
        collectible.isCollected = true;
      }
    }
  }

  public getAllCollectibles(): CollectibleInstance[] {
    return this.collectibles;
  }

  public getCollectedCollectibles(): PersistedCollectible[] {
    return this.collectibles
      .filter((c) => c.isCollected)
      .map((c) => ({
        collectibleId: c.collectibleId,
        collectibleType: c.collectibleType,
      }));
  }

  public destroy() {
    this.scene.events.off(GameEvents.DIALOGUE_ENDED, this.dialogueEndedHandler);
    this.hideInspectCard();
    this.activeCollectible = null;
    this.inspectMode = "idle";

    for (const collectible of this.collectibles) {
      collectible.button.destroy();
      collectible.sprite.destroy();
    }
    this.collectibles = [];
  }

  private registerCollectible(
    obj: Phaser.Types.Tilemaps.TiledObject,
    collectibleData: CollectibleData,
    collectibleType: "CLUE_VILLAIN",
    collectibleId: string,
    player: Phaser.Physics.Arcade.Sprite,
    isCollected: boolean,
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
        this.handleCollectibleInteraction(instance, player);
      },
    });
    button.setPlayerTracking(player);

    instance = {
      collectibleId,
      collectibleType,
      collectibleData,
      isCollected,
      sprite,
      button,
    };

    this.collectibles.push(instance);
  }

  private handleCollectibleInteraction(
    instance: CollectibleInstance,
    player: Phaser.Physics.Arcade.Sprite,
  ) {
    if (this.activeCollectible && this.activeCollectible !== instance) {
      return;
    }

    if (!this.activeCollectible) {
      this.activeCollectible = instance;

      if (!instance.isCollected) {
        instance.isCollected = true;

        const totalCollected = this.collectibles.filter(
          (c) => c.isCollected,
        ).length;
        posthog.capture("star_collected", {
          level_id: this.scene.registry.get("currentLevelId"),
          collectible_id: instance.collectibleId,
          collectible_type: instance.collectibleType,
          total_collected: totalCollected,
          total_available: this.collectibles.length,
        });

        EventBus.emit("collectible:item-collected", {
          itemId: instance.collectibleId,
          itemName:
            instance.collectibleData.metadata.title || instance.collectibleId,
          category: instance.collectibleType,
        });
        this.scene.events.emit(GameEvents.INFO_COLLECTED, {
          infoKey: `pista_${instance.collectibleId}`,
        });
      }

      this.showInspectCard(instance, player);
      this.showOpinionDialogue(instance);
      return;
    }

    if (this.inspectMode === "inspect") {
      this.closeInteraction();
      return;
    }
  }

  private showInspectCard(
    instance: CollectibleInstance,
    player: Phaser.Physics.Arcade.Sprite,
  ) {
    this.hideInspectCard();

    this.inspectMode = "inspect";

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

    const inspectScale = instance.collectibleData.assets.scaleOnInspect ?? 6;
    const inspectSprite = this.scene.add
      .sprite(0, 0, instance.collectibleData.assets.sprite)
      .setScale(inspectScale)
      .setOrigin(0.5, 0.5);

    container.add([shadow, paper, innerFrame, inspectSprite]);

    this.inspectContainer = container;
  }

  private hideInspectCard() {
    if (!this.inspectContainer) return;
    this.inspectContainer.destroy(true);
    this.inspectContainer = null;
  }

  private showOpinionDialogue(instance: CollectibleInstance) {
    const opinion = instance.collectibleData.educational.opinion?.trim();

    const startDialogue = () => {
      if (!this.activeCollectible || this.activeCollectible !== instance) {
        return;
      }

      if (!opinion) {
        this.closeInteraction(true);
        return;
      }

      this.scene.events.emit(
        GameEvents.SHOW_DIALOGUE_REQUEST,
        [opinion],
        () => {
          if (!this.activeCollectible || this.activeCollectible !== instance) {
            return;
          }

          this.closeInteraction(true);
        },
      );
    };

    this.scene.time.delayedCall(0, startDialogue);
  }

  private closeInteraction(force: boolean = false) {
    if (!force && this.inspectMode === "idle") {
      return;
    }

    this.hideInspectCard();
    this.activeCollectible = null;
    this.inspectMode = "idle";
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
