import type * as Phaser from "phaser";
// import { DraggableItem } from "../objects/interactables/DraggableItem";
import { CarryableItem } from "../objects/interactables/CarryableItem";
import { TiledUtils } from "../utils/TiledUtils";
import type { IObjectFactory } from "./IObjectFactory";

export class PictureFactory implements IObjectFactory {
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

    const customId = TiledUtils.getProperty(objData, "id");
    const finalId = customId ? customId.toString() : name || undefined;

    const scaled = TiledUtils.scaleCoords(objData, scale);

    const config = {
      x: scaled.x,
      y: scaled.y,
      texture: texture,
      name: name,
      id: finalId,
    };

    // const item = new PictureItem(scene, config);

    // item.setOrigin(0.5, 0.5);
    // item.setScale(1);
    // return item;
	return new CarryableItem(scene, config)	
  }
}
