import type * as Phaser from "phaser";
// import { DraggableItem } from "../objects/interactables/DraggableItem";
import { CarryableItem } from "../objects/interactables/CarryableItem";
import { InteractableType } from "../types/InteractableTypes";
import { TiledUtils } from "../utils/TiledUtils";
import type { IObjectFactory } from "./IObjectFactory";

export class PaintingFactory implements IObjectFactory {
  create(
    scene: Phaser.Scene,
    objData: Phaser.Types.Tilemaps.TiledObject,
    scale: number,
  ): CarryableItem | null {
    if (objData.x === undefined || objData.y === undefined) return null;

    const name = objData.name || "";
    let index = 0;

    if (name.match(/^P\d+$/)) {
      index = Math.max(0, parseInt(name.substring(1), 10) - 1);
    }

    const textureIndex = index + 1;
    const texture = `painting_${textureIndex.toString().padStart(2, "0")}`;

    const scaled = TiledUtils.scaleCoords(objData, scale);

    const config = {
      x: scaled.x,
      y: scaled.y,
      texture: texture,
      name: name,
      id: name,
      type: InteractableType.PAINTING,
    };

    return new CarryableItem(scene, config);
  }
}
