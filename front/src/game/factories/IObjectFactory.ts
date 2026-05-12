import type * as Phaser from "phaser";
import type { InteractableItem } from "../objects/interactables/InteractableItem";
import type { WorkData } from "../types/GameDataTypes";

export interface IObjectFactory {
  create(
    scene: Phaser.Scene,
    objData: Phaser.Types.Tilemaps.TiledObject,
    scale: number,
    data?: WorkData | unknown,
  ): InteractableItem | null;
}
