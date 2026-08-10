import type * as Phaser from "phaser";
import { GameEvents } from "../constants/GameEvents";
import { TutorialBubble } from "../objects/TutorialBubble";
import { TiledUtils } from "../utils/TiledUtils";

const REGISTRY_KEY = "completedTutorials";

export interface TutorialZone {
  tutorialId: string;
  message: string;
  x: number;
  y: number;
  width: number;
  height: number;
  blockMovement: boolean;
}

export class TutorialSystem {
  private scene: Phaser.Scene;
  private zones: TutorialZone[] = [];
  private completedIds: Set<string> = new Set();
  private activeZone: TutorialZone | null = null;
  private bubble: TutorialBubble | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const stored = this.scene.registry.get(REGISTRY_KEY) as
      | string[]
      | undefined;
    if (stored) {
      this.completedIds = new Set(stored);
    }
  }

  registerZones(zones: TutorialZone[]) {
    this.zones = zones;
  }

  registerFromLayer(layer: Phaser.Tilemaps.ObjectLayer, scale: number = 6) {
    if (!layer?.objects) return;

    layer.objects.forEach((obj) => {
      if (obj.type !== "TutorialZone") return;
      const tutorialId = TiledUtils.getProperty(obj, "id") as string;
      const message = (TiledUtils.getProperty(obj, "message") as string) || "?";

      const rawBlock = TiledUtils.getProperty(obj, "blockMovement");
      const blockMovement = typeof rawBlock === "boolean" ? rawBlock : true;

      if (!tutorialId) {
        console.warn(`[TutorialSystem] Zone "${obj.name}" has no id property`);
        return;
      }

      const scaled = TiledUtils.scaleCoords(obj, scale);

      this.zones.push({
        tutorialId,
        message,
        x: scaled.x,
        y: scaled.y,
        width: scaled.width,
        height: scaled.height,
        blockMovement,
      });
    });
  }

  update(playerX: number, playerY: number, isPlayerBusy: boolean) {
    if (isPlayerBusy) return;

    if (this.activeZone) {
      if (!this.isPlayerInZone(playerX, playerY, this.activeZone)) {
        this.hideBubble();
      }

      return;
    }

    for (const zone of this.zones) {
      if (this.completedIds.has(zone.tutorialId)) continue;

      if (this.isPlayerInZone(playerX, playerY, zone)) {
        this.showBubble(zone);
        break;
      }
    }
  }

  private isPlayerInZone(
    playerX: number,
    playerY: number,
    zone: TutorialZone,
  ): boolean {
    return (
      playerX >= zone.x &&
      playerX <= zone.x + zone.width &&
      playerY >= zone.y &&
      playerY <= zone.y + zone.height
    );
  }

  completeTutorial(tutorialId: string) {
    if (this.completedIds.has(tutorialId)) return;

    this.completedIds.add(tutorialId);
    this.scene.registry.set(REGISTRY_KEY, [...this.completedIds]);

    if (this.activeZone?.tutorialId === tutorialId) {
      this.hideBubble();
    }
  }

  isCompleted(tutorialId: string): boolean {
    return this.completedIds.has(tutorialId);
  }

  private showBubble(zone: TutorialZone) {
    this.activeZone = zone;

    const centerX = zone.x + zone.width / 2;
    this.bubble = new TutorialBubble(
      this.scene,
      centerX,
      zone.y,
      zone.message,
      centerX,
      zone.y,
    );
    this.bubble.show();

    this.scene.events.emit(GameEvents.TUTORIAL_SHOWN, {
      tutorialId: zone.tutorialId,
      blockMovement: zone.blockMovement,
    });
  }

  private hideBubble() {
    if (this.bubble) {
      this.bubble.destroy();
      this.bubble = null;
    }

    const prevZone = this.activeZone;
    this.activeZone = null;

    if (prevZone) {
      this.scene.events.emit(GameEvents.TUTORIAL_DISMISSED, {
        tutorialId: prevZone.tutorialId,
      });
    }
  }

  destroy() {
    if (this.bubble) {
      this.bubble.destroy();
      this.bubble = null;
    }
    this.zones = [];
    this.activeZone = null;
  }
}
