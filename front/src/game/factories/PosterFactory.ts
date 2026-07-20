import type * as Phaser from "phaser";
import { CarryableItem } from "../objects/interactives/CarryableItem";
import type { WorkData } from "../types/GameDataTypes";
import { InteractiveType } from "../types/InteractiveTypes";
import { TiledUtils } from "../utils/TiledUtils";
import type { IObjectFactory } from "./IObjectFactory";

export class PosterFactory implements IObjectFactory {
  create(
    scene: Phaser.Scene,
    objData: Phaser.Types.Tilemaps.TiledObject,
    scale: number,
    data?: WorkData,
  ): CarryableItem | null {
    if (objData.x === undefined || objData.y === undefined) return null;

    const name = data?.id || objData.name || "";
    const texture = data?.assets?.sprite || name;

    const scaled = TiledUtils.scaleCoords(objData, scale);

    const rawScale = TiledUtils.getProperty(objData, "scale");
    const itemScale = Number(rawScale);
    const finalScale =
      Number.isFinite(itemScale) && itemScale > 0 ? itemScale : 1;

    const config = {
      x: scaled.x,
      y: scaled.y,
      texture,
      name: data?.metadata?.title || name,
      id: data?.id || name,
      type: InteractiveType.POSTER,
    };

    const item = new CarryableItem(scene, config);
    item.setOrigin(0.5, 1);
    item.setScale(finalScale);

    return item;
  }
}
