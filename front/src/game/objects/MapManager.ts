import type * as Phaser from "phaser";
import { MissionIds } from "../constants/MissionConstants";
import type { MapData } from "../systems/TiledMapLoader";
import type { ContentJson } from "../types/GameDataTypes";
import type { TiledProperty } from "../utils/TiledUtils";
import { MovingPlatform, type PlatformDirection } from "./MovingPlatform";
import { Npc, type NpcConfig } from "./Npc";
import { Portal } from "./Portal";

export namespace MapManager {
  export function createNpcs(
    scene: Phaser.Scene,
    mapData: MapData,
    contentJson?: ContentJson,
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
          const contentId = (properties?.find((p) => p.name === "contentId")
            ?.value || obj.name) as string | undefined;

          const flipX =
            (properties?.find((p) => p.name === "flipX")?.value as boolean) ||
            false;

          let config: NpcConfig | undefined;
          const finalMissionId =
            missionId === "obras_famosas" ? MissionIds.CURATOR : missionId;

          if (contentId && contentJson?.npcs?.[contentId]) {
            const npcData = contentJson.npcs[contentId];
            if (npcData.dialogues) {
              config = {
                name: npcData.name,
                missionId: npcData.missionId || finalMissionId || "unknown",
                dialogues: npcData.dialogues,
                quiz: contentJson.quizzes?.[npcData.missionId || ""],
                intermediateQuiz: npcData.dialogues.intermediateQuiz,
                spawnX: obj.x * scale,
                spawnY: obj.y * scale,
              };
            }
          }

          if (config) {
            const npc = new Npc(scene, obj.x * scale, obj.y * scale, config);
            npc.setFlipX(flipX);
            npcs.push(npc);
          } else if (missionId) {
            console.warn(
              `[MapManager] NPC at (${obj.x}, ${obj.y}) has invalid or missing JSON data for missionId: ${missionId}`,
            );
          }
        }
      });
    });

    return npcs;
  }

  export function createPortals(
    scene: Phaser.Scene,
    mapData: MapData,
    scale: number = 6,
  ): Portal[] {
    const portals: Portal[] = [];

    Object.values(mapData.objectLayers).forEach((layer) => {
      layer.objects.forEach((obj: Phaser.Types.Tilemaps.TiledObject) => {
        if (
          obj.type === "Portal" &&
          obj.x !== undefined &&
          obj.y !== undefined
        ) {
          const properties = obj.properties as TiledProperty[] | undefined;
          const pairIDProp = properties?.find((p) => p.name === "pairID");
          const pairID = pairIDProp ? pairIDProp.value : undefined;

          if (pairID !== undefined) {
            const width = (obj.width || 16) * scale;
            const height = (obj.height || 16) * scale;

            const cx = obj.x * scale + width / 2;
            const cy = obj.y * scale + height / 2;

            const portal = new Portal(
              scene,
              cx,
              cy,
              width,
              height,
              pairID as string | number,
            );
            portals.push(portal);
          }
        }
      });
    });

    portals.forEach((p1) => {
      const pair = portals.find((p2) => p2 !== p1 && p2.pairID === p1.pairID);
      if (pair) {
        p1.targetPortal = pair;
      }
    });

    return portals;
  }
    /**
     * Scan all object layers for Tiled objects whose Class (type) is
     * "MovingPlatform" and instantiate them.
     *
     * Expected custom properties on each Tiled object:
     *  - `speed`     (float)  – pixels/second at full speed (default 100)
     *  - `direction` (string) – "left" | "right" | "up" | "down" (default "right")
     *  - `distance`  (float)  – travel distance in Tiled-unit pixels (default 100)
     *
     * The object's rectangle (x, y, width, height) defines the platform bounds.
     */
    export function createMovingPlatforms(
      scene: Phaser.Scene,
      mapData: MapData,
      scale: number = 6,
    ): MovingPlatform[] {
      const platforms: MovingPlatform[] = [];

      Object.values(mapData.objectLayers).forEach((layer) => {
        layer.objects.forEach((obj: Phaser.Types.Tilemaps.TiledObject) => {
          const objectType =
            obj.type || (obj as Record<string, unknown>).class || "";

          if (objectType !== "MovingPlatform") return;
          if (obj.x === undefined || obj.y === undefined) return;

          const properties = obj.properties as TiledProperty[] | undefined;

          const speedProp = properties?.find((p) => p.name === "speed");
          const speed = speedProp ? Number(speedProp.value) : 100;

          const dirProp = properties?.find((p) => p.name === "direction");
          const direction = (
            dirProp ? String(dirProp.value) : "right"
          ) as PlatformDirection;

          const distProp = properties?.find((p) => p.name === "distance");
          const distance = distProp ? Number(distProp.value) * scale : 100;

          const textureProp = properties?.find((p) => p.name === "texture");
          const texture = textureProp ? String(textureProp.value) : undefined;

          const platform = new MovingPlatform(scene, {
            x: obj.x * scale,
            y: obj.y * scale,
            width: (obj.width || 16) * scale,
            height: (obj.height || 16) * scale,
            speed,
            direction,
            distance,
            texture,
            scale,
          });

          platforms.push(platform);
        });
      });

      return platforms;
    }
  }
