import type * as Phaser from "phaser";
import { LayoutConfig } from "../constants/LayoutConfig";
import type { IObjectFactory } from "../factories/IObjectFactory";
import { PaintingFactory } from "../factories/PaintingFactory";
import { PhotoFactory } from "../factories/PhotoFactory";
import { SculptureFactory } from "../factories/SculptureFactory";
import type { InteractableItem } from "../objects/interactables/InteractableItem";
import type { ContentJson, WorkData } from "../types/GameDataTypes";

import { TiledUtils } from "../utils/TiledUtils";
import type { MapData } from "./TiledMapLoader";

enum WORKS {
  PAINTINGS = "PAINTINGS",
  SCULPTURES = "SCULPTURES",
  PHOTOS = "PHOTOS",
}

export class ObjectLayerProcessor {
  private factories: Map<string, IObjectFactory> = new Map();

  constructor() {
    this.factories.set("sculpture", new SculptureFactory());
    this.factories.set("painting", new PaintingFactory());
    this.factories.set("photo", new PhotoFactory());
    this.factories.set("photos", new PhotoFactory());
    this.factories.set("picture", new PhotoFactory());
    this.factories.set("pictures", new PhotoFactory());
    this.factories.set("picture_chunk", new PhotoFactory());
    this.factories.set("chunk", new PhotoFactory());
  }

  public registerFactory(type: string, factory: IObjectFactory) {
    this.factories.set(type.toLowerCase(), factory);
  }

  public process(
    scene: Phaser.Scene,
    mapData: MapData,
    contentJson?: ContentJson,
    scale: number = LayoutConfig.GAME.MAP_SCALE,
  ): InteractableItem[] {
    const items: InteractableItem[] = [];

    for (const [layerName, layer] of Object.entries(mapData.objectLayers)) {
      layer.objects.forEach((obj: Phaser.Types.Tilemaps.TiledObject) => {
        let type = String(
          obj.type || (obj as Record<string, unknown>).class || "",
        ).toLowerCase();

        if (!type) {
          type = layerName.toLowerCase();
          if (type.endsWith("s")) type = type.slice(0, -1);
        }

        if (this.factories.has(type)) {
          const factory = this.factories.get(type);
          if (factory) {
            let contentID = (TiledUtils.getProperty(obj, "contentID") ||
              TiledUtils.getProperty(obj, "contentId") ||
              TiledUtils.getProperty(obj, "contenteId")) as string;

            if (!contentID || contentID === "") {
              contentID = obj.name;
            }

            const category =
              layerName.toUpperCase() as keyof ContentJson["works"];
            const works = contentJson?.works;

            const data =
              (works?.[category] as Record<string, WorkData>)?.[contentID] ||
              works?.[WORKS.PAINTINGS]?.[contentID] ||
              works?.[WORKS.SCULPTURES]?.[contentID] ||
              works?.[WORKS.PHOTOS]?.[contentID];

            const item = factory.create(scene, obj, scale, data);
            if (item) {
              if (data) {
                item.setData("payload", data);
              } else {
                console.warn(
                  `[ObjectLayerProcessor] No data found for "${contentID}" in category "${category}"`,
                );
              }
              items.push(item);
            }
          }
        }
      });
    }

    return items;
  }
}
