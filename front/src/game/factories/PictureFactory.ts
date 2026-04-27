import type * as Phaser from "phaser";
import { CarryableItem } from "../objects/interactables/CarryableItem";
import { InteractableType } from "../types/InteractableTypes";
import { TiledUtils } from "../utils/TiledUtils";
import type { IObjectFactory } from "./IObjectFactory";

export class PictureFactory implements IObjectFactory {
  create(
    scene: Phaser.Scene,
    objData: Phaser.Types.Tilemaps.TiledObject,
    scale: number,
  ): CarryableItem | null {
    if (objData.x === undefined || objData.y === undefined) return null;

    const name = objData.name || "chunk_unknown";
    const texture = name;

    const scaled = TiledUtils.scaleCoords(objData, scale);

    const config = {
      x: scaled.x,
      y: scaled.y,
      texture: texture,
      name: name,
      id: name,
      type: InteractableType.PICTURE_CHUNK,
    };

    return new CarryableItem(scene, config);
  }
}
