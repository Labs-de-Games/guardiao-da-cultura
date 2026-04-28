import { MissionIds, MissionKeys } from "../constants/MissionConstants";
import type { MissionDef } from "../types/GameDataTypes";

export const MissionRequirements = [
  {
    id: MissionIds.CURATOR,
    requiredInfos: [
      MissionKeys.PAINTINGS_DONE,
      MissionKeys.SCULPTURES_DONE,
      MissionKeys.PHOTO_DONE,
    ],
  },
];

export const MissionRegistry: Record<string, MissionDef> = {
  [MissionIds.CURATOR]: {
    id: MissionIds.CURATOR,
    title: "Restauração do Museu",
    steps: [
      {
        infoKey: MissionKeys.PAINTINGS_DONE,
        text: "Organizar todas as pinturas",
      },
      {
        infoKey: MissionKeys.SCULPTURES_DONE,
        text: "Organizar todas as esculturas",
      },
      { infoKey: MissionKeys.PHOTO_DONE, text: "Remontar a fotografia antiga" },
    ],
  },
};
