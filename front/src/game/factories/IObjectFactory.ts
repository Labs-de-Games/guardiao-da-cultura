import type * as Phaser from "phaser";
import type { InteractableItem } from "../objects/interactables/InteractableItem";

export interface IObjectFactory {
  create(
    scene: Phaser.Scene,
    objData: Phaser.Types.Tilemaps.TiledObject,
    scale: number,
  ): InteractableItem | null;
}
