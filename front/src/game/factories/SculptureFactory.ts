import type * as Phaser from "phaser";
import { DraggableItem } from "../objects/interactables/DraggableItem";
import type { WorkData } from "../types/GameDataTypes";
import { InteractableType } from "../types/InteractableTypes";
import { TiledUtils } from "../utils/TiledUtils";
import type { IObjectFactory } from "./IObjectFactory";

export class SculptureFactory implements IObjectFactory {
  create(
    scene: Phaser.Scene,
    objData: Phaser.Types.Tilemaps.TiledObject,
    scale: number,
    data?: WorkData,
  ): DraggableItem | null {
    if (objData.x === undefined || objData.y === undefined) return null;

    const name = data?.id || objData.name || "";
    let texture = "";

    if (data?.assets?.sprite) {
      texture = data.assets.sprite;
    } else {
      texture = name;
      if (name.match(/^S\d+$/)) {
        const num = name.substring(1).padStart(2, "0");
        texture = `sprite_${num}`;
      }
    }

    if (!texture || texture === "") texture = "default_sculpture";

    const scaled = TiledUtils.scaleCoords(objData, scale);

    const rawScale = TiledUtils.getProperty(objData, "scale");
    const itemScale = Number(rawScale);
    const finalScale =
      Number.isFinite(itemScale) && itemScale > 0 ? itemScale : 1;

    const config = {
      x: scaled.x,
      y: scaled.y,
      texture: texture,
      name: data?.metadata?.title || name,
      id: data?.id || name,
      type: InteractableType.SCULPTURE,
    };

    const item = new DraggableItem(scene, config);

    // Sculptures are authored in Tiled as bottom-center points.
    item.setOrigin(0.5, 1);
    item.setScale(finalScale);

    // Collision footprint: pedestal only.
    // Assets are tightly cropped to pedestal width, and pedestal height is fixed
    // in texture pixels (then scales with the sprite).
    const PEDESTAL_HEIGHT_PX = 94;
    const pedestalWidthPx = item.width;
    item.setData("pedestalWidthPx", pedestalWidthPx);

    const body = item.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(pedestalWidthPx, PEDESTAL_HEIGHT_PX);

      // Offset values are expressed in texture pixels.
      body.setOffset(
        (item.width - pedestalWidthPx) / 2,
        item.height - PEDESTAL_HEIGHT_PX,
      );
    }

    return item;
  }
}
