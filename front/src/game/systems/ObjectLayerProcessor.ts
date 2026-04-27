import type * as Phaser from "phaser";
import { LayoutConfig } from "../constants/LayoutConfig";
import type { IObjectFactory } from "../factories/IObjectFactory";
import { PaintingFactory } from "../factories/PaintingFactory";
import { PictureFactory } from "../factories/PictureFactory";
import { SculptureFactory } from "../factories/SculptureFactory";
import type { InteractableItem } from "../objects/interactables/InteractableItem";
import type { MapData } from "./TiledMapLoader";

export class ObjectLayerProcessor {
  private factories: Map<string, IObjectFactory> = new Map();

  constructor() {
    this.factories.set("sculpture", new SculptureFactory());
    this.factories.set("painting", new PaintingFactory());
    this.factories.set("picture", new PictureFactory());
    this.factories.set("pictures", new PictureFactory());
    this.factories.set("picture_chunk", new PictureFactory());
    this.factories.set("chunk", new PictureFactory());
  }

  public registerFactory(type: string, factory: IObjectFactory) {
    this.factories.set(type.toLowerCase(), factory);
  }

  public process(
    scene: Phaser.Scene,
    mapData: MapData,
    scale: number = LayoutConfig.GAME.MAP_SCALE,
  ): InteractableItem[] {
    const items: InteractableItem[] = [];

    for (const [layerName, layer] of Object.entries(mapData.objectLayers)) {
      layer.objects.forEach((obj: Phaser.Types.Tilemaps.TiledObject) => {
        // Priority: 1. Object Type, 2. Object Class (Tiled 1.9+), 3. Layer Name (singularized)
        let type = String(
          obj.type || (obj as Record<string, unknown>).class || "",
        ).toLowerCase();

        if (!type) {
          // Fallback to layer name (e.g. "Sculptures" -> "sculpture")
          type = layerName.toLowerCase();
          if (type.endsWith("s")) type = type.slice(0, -1);
        }

        if (this.factories.has(type)) {
          const factory = this.factories.get(type);
          if (factory) {
            const item = factory.create(scene, obj, scale);
            if (item) {
              items.push(item);
            }
          }
        }
      });
    }

    return items;
  }
}
