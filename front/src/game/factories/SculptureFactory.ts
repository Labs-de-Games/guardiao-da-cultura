import type * as Phaser from "phaser";
import { DraggableItem } from "../objects/interactables/DraggableItem";
import { InteractableType } from "../types/InteractableTypes";
import { TiledUtils } from "../utils/TiledUtils";
import type { IObjectFactory } from "./IObjectFactory";

export class SculptureFactory implements IObjectFactory {
  create(
    scene: Phaser.Scene,
    objData: Phaser.Types.Tilemaps.TiledObject,
    scale: number,
  ): DraggableItem | null {
    if (objData.x === undefined || objData.y === undefined) return null;

    const name = objData.name || "";
    let texture = name;

    if (name.match(/^S\d+$/)) {
      const num = name.substring(1).padStart(2, "0");
      texture = `sprite_${num}`;
    }

    if (!texture || texture === "") texture = "default_sculpture";

    const scaled = TiledUtils.scaleCoords(objData, scale);

    const config = {
      x: scaled.x,
      y: scaled.y,
      texture: texture,
      name: name,
      id: name,
      type: InteractableType.SCULPTURE,
    };

    return new DraggableItem(scene, config);
  }
}
