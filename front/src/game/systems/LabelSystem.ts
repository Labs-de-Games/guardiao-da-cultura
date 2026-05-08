import * as Phaser from "phaser";
import { LayoutConfig } from "../constants/LayoutConfig";
import { TiledUtils } from "../utils/TiledUtils";

export interface LabelInstance {
  sprite: Phaser.GameObjects.Sprite;
  instanceId: string;
  placeholderId: string;
  x: number;
  y: number;
}

export interface LabelConfig {
  x: number;
  y: number;
  instanceId: string;
  placeholderId: string;
}

export class LabelSystem {
  private labels: LabelInstance[] = [];
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Registers all Label objects from a Tiled object layer.
  // Labels are identified by their type property being "Label".
  public registerAllFromLayer(
    layer: Phaser.Tilemaps.ObjectLayer,
    scale: number = LayoutConfig.GAME.MAP_SCALE,
  ): void {
    if (!layer?.objects) return;

    layer.objects.forEach((obj) => {
      const objType = obj.type;

      // Only process objects with type "Label"
      if (objType !== "Label") return;

      const placeholderId = TiledUtils.getProperty(
        obj,
        "placeholder_id",
      ) as string;

      if (!placeholderId) {
        console.warn(
          `[LabelSystem] Label "${obj.name}" has no placeholder_id property`,
        );
        return;
      }

      const scaled = TiledUtils.scaleCoords(obj, scale);

      this.registerLabel({
        x: scaled.x,
        y: scaled.y,
        instanceId: obj.name || Phaser.Math.RND.uuid(),
        placeholderId,
      });
    });
  }

  // Registers a single label at the specified position.
  public registerLabel(config: LabelConfig): LabelInstance {
    const sprite = this.scene.add.sprite(config.x, config.y, "label");
    sprite.setScale(4);
    sprite.setDepth(10);

    const instance: LabelInstance = {
      sprite,
      instanceId: config.instanceId,
      placeholderId: config.placeholderId,
      x: config.x,
      y: config.y,
    };

    this.labels.push(instance);
    return instance;
  }

  // Gets a label by its instance ID (e.g., "L_1")
  public getLabelByInstanceId(instanceId: string): LabelInstance | null {
    return this.labels.find((l) => l.instanceId === instanceId) || null;
  }

  // Gets a label by its associated placeholder ID (e.g., "PH_1")
  public getLabelByPlaceholderId(placeholderId: string): LabelInstance | null {
    return this.labels.find((l) => l.placeholderId === placeholderId) || null;
  }

  // Gets a nearby label within a max distance.
  public getNearbyLabel(
    x: number,
    y: number,
    maxDistance: number = 120,
  ): LabelInstance | null {
    let closest: LabelInstance | null = null;
    let minDist = maxDistance;

    for (const label of this.labels) {
      const dist = Phaser.Math.Distance.Between(
        x,
        y,
        label.sprite.x,
        label.sprite.y,
      );
      if (dist < minDist) {
        minDist = dist;
        closest = label;
      }
    }

    return closest;
  }

  // Gets all registered labels.
  public getAllLabels(): LabelInstance[] {
    return this.labels;
  }

  //Removes a label by its instance ID.
  public removeLabel(instanceId: string): boolean {
    const index = this.labels.findIndex((l) => l.instanceId === instanceId);
    if (index === -1) return false;

    const label = this.labels[index];
    label.sprite.destroy();
    this.labels.splice(index, 1);
    return true;
  }

  // Destroys all labels and cleans up.
  public destroy(): void {
    this.labels.forEach((label) => {
      label.sprite.destroy();
    });
    this.labels = [];
  }
}
