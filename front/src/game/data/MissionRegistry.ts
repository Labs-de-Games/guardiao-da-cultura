import { MissionIds, MissionKeys } from "../constants/MissionConstants";
import type { MissionDef } from "../types/GameDataTypes";

export const MissionRequirements = [
  {
    id: MissionIds.CURATOR,
    requiredInfos: [
      MissionKeys.SCULPTURES_DONE,
      MissionKeys.PAINTINGS_DONE,
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
      },
      {
        infoKey: MissionKeys.PAINTINGS_DONE,
        text: "Reorganizar todas as pinturas",
      },
      { infoKey: MissionKeys.PHOTO_DONE, text: "Remontar a fotografia" },
    ],
  },
};
