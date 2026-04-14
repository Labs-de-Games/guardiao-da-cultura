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

export interface MapData {
  tileLayers: Record<string, Phaser.Tilemaps.TilemapLayer>;
  objectLayers: Record<string, Phaser.Tilemaps.ObjectLayer>;
  colliders: Phaser.Tilemaps.TilemapLayer[]; // Added to track all layers with collision
}

export namespace MapManager {
  /**
   * Dynamically creates all tile layers and extracts object layers from the map,
   * relying on Tiled custom properties (e.g., 'collider' and 'oneWay').
   */
  export function setupMap(
    _scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    tileset: Phaser.Tilemaps.Tileset,
    scale: number = 6,
  ): MapData {
    const result: MapData = {
      tileLayers: {},
      objectLayers: {},
      colliders: [],
    };

    // 1. Process Tilemap Layers dynamically
    for (const layerData of map.layers) {
      const layer = map.createLayer(layerData.name, tileset, 0, 0);
      if (!layer) continue;

      layer.setScale(scale);

      // Check for collision-related custom properties set in Tiled editor
      const properties = layerData.properties as TiledProperty[] | undefined;

      const colliderProp = properties?.find((p) => p.name === "collider");
      const hasCollider = colliderProp
        ? (colliderProp.value as boolean)
        : false;

      const oneWayProp = properties?.find((p) => p.name === "oneWay");
      const isOneWay = oneWayProp ? (oneWayProp.value as boolean) : false;

      if (hasCollider || isOneWay) {
        // Apply collisions to all tiles except empty ones (-1)
        layer.setCollisionByExclusion([-1]);

        if (isOneWay) {
          // Configure tiles as one-way platforms:
          // Collision only from top to bottom (player can jump through from below)
          layer.forEachTile((tile) => {
            if (tile.index !== -1) {
              tile.collideUp = true;
              tile.collideDown = false;
              tile.collideLeft = false;
              tile.collideRight = false;
            }
          });
        }

        result.colliders.push(layer);
      }

      // Optional: Support for dynamically setting depth (Z-Index)
      const depthProp = properties?.find((p) => p.name === "depth");
      if (depthProp !== undefined) {
        layer.setDepth(depthProp.value as number);
      }

      result.tileLayers[layerData.name] = layer;
    }

    // 2. Process Object Layers
    if (map.objects) {
      for (const objLayer of map.objects) {
        result.objectLayers[objLayer.name] = objLayer;
      }
    }

    return result;
  }

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
