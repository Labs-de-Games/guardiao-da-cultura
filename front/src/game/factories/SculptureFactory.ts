import type * as Phaser from "phaser";
import { DraggableItem } from "../objects/interactables/DraggableItem";
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

    // Mapping: S1 -> sprite_01, S2 -> sprite_02, etc.
    if (name.match(/^S\d+$/)) {
      const num = name.substring(1).padStart(2, "0");
      texture = `sprite_${num}`;
    }

    if (!texture || texture === "") texture = "default_sculpture";

    // Use TiledUtils to prioritize custom 'id' property
    const customId = TiledUtils.getProperty(objData, "id");
    const finalId = customId.toString();

    const scaled = TiledUtils.scaleCoords(objData, scale);

    const config = {
      x: scaled.x,
      y: scaled.y,
      texture: texture,
      name: name,
      id: finalId,
    };

    return new DraggableItem(scene, config);
  }
}
