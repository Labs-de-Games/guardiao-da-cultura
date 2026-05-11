import type * as Phaser from "phaser";
// import { DraggableItem } from "../objects/interactives/DraggableItem";
import { CarryableItem } from "../objects/interactives/CarryableItem";
import type { WorkData } from "../types/GameDataTypes";
import { InteractiveType } from "../types/InteractiveTypes";
import { TiledUtils } from "../utils/TiledUtils";
import type { IObjectFactory } from "./IObjectFactory";

export class PaintingFactory implements IObjectFactory {
  create(
    scene: Phaser.Scene,
    objData: Phaser.Types.Tilemaps.TiledObject,
    scale: number,
    data?: WorkData,
  ): CarryableItem | null {
    if (objData.x === undefined || objData.y === undefined) return null;

    const name = data?.id || objData.name || "";
    let texture = "";

    if (data?.assets?.sprite) {
      texture = data.assets.sprite;
    } else {
      let index = 0;
      if (name.match(/^P\d+$/)) {
        index = Math.max(0, parseInt(name.substring(1), 10) - 1);
      }
      const textureIndex = index + 1;
      texture = `painting_${textureIndex.toString().padStart(2, "0")}`;
    }

    const scaled = TiledUtils.scaleCoords(objData, scale);

    const config = {
      x: scaled.x,
      y: scaled.y,
      texture: texture,
      name: data?.metadata?.title || name,
      id: data?.id || name,
      type: InteractiveType.PAINTING,
    };

    return new CarryableItem(scene, config);
  }
}
