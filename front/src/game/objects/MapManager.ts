import type * as Phaser from "phaser";
import { GameEvents } from "../constants/GameEvents";
import { ObjectRegistry } from "../data/ObjectRegistry";
import { NPC_CONFIGS } from "./Dialog";
import { InteractiveButton } from "./InteractiveButton";
import { Npc } from "./Npc";

/** Interface helper to Tiled properties */
type TiledPropertyValue = unknown;

interface TiledProperty {
  name: string;
  type: string;
  value: TiledPropertyValue;
}

import type { MapData } from "../systems/TiledMapLoader";

export namespace MapManager {
  /**
   * Dynamically loads NPCs from the object layers in the map data.
   */
  export function createNpcs(
    scene: Phaser.Scene,
    mapData: MapData,
    scale: number = 6,
  ): Npc[] {
    const npcs: Npc[] = [];

    Object.values(mapData.objectLayers).forEach((layer) => {
      layer.objects.forEach((obj: Phaser.Types.Tilemaps.TiledObject) => {
        const objectType = obj.type;

        if (
          objectType === "Npc" &&
          obj.x !== undefined &&
          obj.y !== undefined
        ) {
          const properties = obj.properties as TiledProperty[] | undefined;
          const missionId = properties?.find((p) => p.name === "missionId")
            ?.value as string | undefined;
          const flipX =
            (properties?.find((p) => p.name === "flipX")?.value as boolean) ||
            false;

          const config = missionId ? NPC_CONFIGS[missionId] : undefined;
          if (config) {
            const npc = new Npc(scene, obj.x * scale, obj.y * scale, config);
            npc.setFlipX(flipX);
            npcs.push(npc);
          } else {
            console.warn(
              `[MapManager] NPC at (${obj.x}, ${obj.y}) has invalid missionId: ${missionId}`,
            );
          }
        }
      });
    });

    return npcs;
  }

  /**
   * Creates interactive items based on Tiled objects and ObjectRegistry.
   * (Task 38 - Data-Driven approach)
   */
  export function createInteractiveObjects(
    scene: Phaser.Scene,
    mapData: MapData,
    scale: number = 6,
    onInfoCollected?: (key: string) => void,
  ): Record<string, InteractiveButton> {
    const items: Record<string, InteractiveButton> = {};

    Object.values(mapData.objectLayers).forEach((layer) => {
      layer.objects.forEach((obj: Phaser.Types.Tilemaps.TiledObject) => {
        // If the object name exists in our Registry, instantiate it
        if (
          obj.name &&
          ObjectRegistry[obj.name] &&
          obj.x !== undefined &&
          obj.y !== undefined
        ) {
          const config = ObjectRegistry[obj.name];

          const item = new InteractiveButton(
            scene,
            obj.x * scale,
            obj.y * scale,
            {
              ...config,
              onInfoCollected: (key) => {
                if (onInfoCollected) onInfoCollected(key);
                scene.events.emit(GameEvents.INFO_COLLECTED, key);
              },
            },
          );

          items[obj.name] = item;
        }
      });
    });

    return items;
  }
}
