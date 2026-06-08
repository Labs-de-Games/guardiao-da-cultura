import { MissionIds, MissionKeys } from "../constants/MissionConstants";
import type { MissionDef } from "../types/GameDataTypes";
import { InteractiveType } from "../types/InteractiveTypes";

export const MissionRequirements = [
  {
    id: MissionIds.CURATOR,
    requiredInfos: [
      MissionKeys.SCULPTURES_DONE,
      MissionKeys.PAINTINGS_DONE,
      MissionKeys.PHOTO_COLLECTED,
      MissionKeys.PHOTO_DONE,
    ],
  },
];

export const MissionRegistry: Record<string, MissionDef> = {
  [MissionIds.CURATOR]: {
    id: MissionIds.CURATOR,
    title: "Sala de restauração",
    steps: [
      {
        infoKey: MissionKeys.SCULPTURES_DONE,
        text: "Reorganizar todas as esculturas",
        categoryType: InteractiveType.SCULPTURE,
      },
      {
        infoKey: MissionKeys.PAINTINGS_DONE,
        text: "Reorganizar todas as pinturas",
        categoryType: InteractiveType.PAINTING,
      },
      {
        infoKey: MissionKeys.PHOTO_DONE,
        text: "Remontar a fotografia",
        categoryType: InteractiveType.PHOTO,
      },
      {
        infoKey: MissionKeys.PHOTO_COLLECTED,
        text: "Encontrar os pedaços da fotografia",
      },
    ],
  },
};
