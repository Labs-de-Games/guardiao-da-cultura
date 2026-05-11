import type * as Phaser from "phaser";
import type { InteractiveItem } from "../objects/interactives/InteractiveItem";
import type { WorkData } from "../types/GameDataTypes";

export interface IObjectFactory {
  create(
    scene: Phaser.Scene,
    objData: Phaser.Types.Tilemaps.TiledObject,
    scale: number,
    data?: WorkData | unknown,
  ): InteractiveItem | null;
}
