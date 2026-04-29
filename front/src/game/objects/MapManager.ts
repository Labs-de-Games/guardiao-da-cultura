import type * as Phaser from "phaser";
import { MissionIds } from "../constants/MissionConstants";
import type { MapData } from "../systems/TiledMapLoader";
import type { ContentJson } from "../types/GameDataTypes";
import type { TiledProperty } from "../utils/TiledUtils";
import { Npc, type NpcConfig } from "./Npc";

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
}
