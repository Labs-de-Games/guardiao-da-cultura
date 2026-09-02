import type * as Phaser from "phaser";
import type { TiledProperty } from "../utils/TiledUtils";
import type { DisappearingPlatformConfig } from "./DisappearingPlatformTracker";

export interface DisappearingPlatformLayer {
  layer: Phaser.Tilemaps.TilemapLayer;
  config: DisappearingPlatformConfig;
}

export interface MapData {
  tileLayers: Record<string, Phaser.Tilemaps.TilemapLayer>;
  objectLayers: Record<string, Phaser.Tilemaps.ObjectLayer>;
  colliders: Phaser.Tilemaps.TilemapLayer[];
  oneWayColliders: Phaser.Tilemaps.TilemapLayer[];
  disappearingLayers: DisappearingPlatformLayer[];
}

const DEFAULT_DISAPPEARING_DELAY_MS = 500;
const DEFAULT_DISAPPEARING_FADE_DURATION_MS = 300;
const DEFAULT_DISAPPEARING_RESPAWN_DELAY_MS = 2000;

function getNumberProperty(
  properties: TiledProperty[] | undefined,
  name: string,
  defaultValue: number,
): number {
  const prop = properties?.find((p) => p.name === name);
  return prop ? (prop.value as number) : defaultValue;
}

export namespace TiledMapLoader {
  export function loadMap(
    _scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    tileset: Phaser.Tilemaps.Tileset,
    scale: number = 6,
  ): MapData {
    const result: MapData = {
      tileLayers: {},
      objectLayers: {},
      colliders: [],
      oneWayColliders: [],
      disappearingLayers: [],
    };

    for (const layerData of map.layers) {
      // createLayer's return type is now a TilemapLayer | TilemapGPULayer union
      // (Phaser 4 added an opt-in GPU layer); this project never requests one.
      const layer = map.createLayer(
        layerData.name,
        tileset,
        0,
        0,
      ) as Phaser.Tilemaps.TilemapLayer | null;
      if (!layer) continue;

      layer.setScale(scale);

      const properties = layerData.properties as TiledProperty[] | undefined;
      const colliderProp = properties?.find((p) => p.name === "collider");
      const hasCollider = colliderProp
        ? (colliderProp.value as boolean)
        : false;

      const oneWayProp = properties?.find((p) => p.name === "oneWay");
      const isOneWay = oneWayProp ? (oneWayProp.value as boolean) : false;

      const disappearingProp = properties?.find(
        (p) => p.name === "disappearing",
      );
      const isDisappearing = disappearingProp
        ? (disappearingProp.value as boolean)
        : false;

      if (hasCollider || isOneWay || isDisappearing) {
        layer.setCollisionByExclusion([-1]);

        if (isOneWay || isDisappearing) {
          // Same one-way behavior as oneWay layers: only the top face collides,
          // so the player can jump up through the platform from below.
          layer.forEachTile((tile) => {
            if (tile.index !== -1) {
              tile.collideUp = true;
              tile.collideDown = false;
              tile.collideLeft = false;
              tile.collideRight = false;
            }
          });

          if (isDisappearing) {
            result.disappearingLayers.push({
              layer,
              config: {
                delay: getNumberProperty(
                  properties,
                  "delay",
                  DEFAULT_DISAPPEARING_DELAY_MS,
                ),
                fadeDuration: getNumberProperty(
                  properties,
                  "fadeDuration",
                  DEFAULT_DISAPPEARING_FADE_DURATION_MS,
                ),
                respawnDelay: getNumberProperty(
                  properties,
                  "respawnDelay",
                  DEFAULT_DISAPPEARING_RESPAWN_DELAY_MS,
                ),
              },
            });
          } else {
            result.oneWayColliders.push(layer);
          }
        } else {
          result.colliders.push(layer);
        }
      }

      const depthProp = properties?.find((p) => p.name === "depth");
      if (depthProp !== undefined) {
        layer.setDepth(depthProp.value as number);
      }

      result.tileLayers[layerData.name] = layer;
    }

    if (map.objects) {
      for (const objLayer of map.objects) {
        result.objectLayers[objLayer.name] = objLayer;
      }
    }

    return result;
  }
}
